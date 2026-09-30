use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::{fs, path::Path};
const TABLES: [&str; 7] = [
    "subjects",
    "countries",
    "topics",
    "nodes",
    "relations",
    "sessions",
    "tests",
];
type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn string<'a>(v: &'a Value, key: &str) -> Result<&'a str> {
    v[key]
        .as_str()
        .ok_or_else(|| format!("Missing string: {key}"))
}
fn optional<'a>(v: &'a Value, key: &str) -> Option<&'a str> {
    v[key].as_str()
}
fn number(v: &Value, key: &str) -> Result<i64> {
    v[key]
        .as_i64()
        .ok_or_else(|| format!("Missing integer: {key}"))
}
pub fn open(path: &Path) -> Result<Connection> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(err)?;
    }
    let conn = Connection::open(path).map_err(err)?;
    conn.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(err)?;
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;")
        .map_err(err)?;
    let version: i64 = conn
        .pragma_query_value(None, "user_version", |r| r.get(0))
        .map_err(err)?;
    if version > 2 {
        return Err(
            "This notebook was created by a newer ATLAS. Update the application before opening it."
                .into(),
        );
    }
    if version == 0 {
        conn.execute_batch(include_str!("schema.sql"))
            .map_err(err)?;
    } else if version == 1 {
        // Old notebooks get the new table without touching their topics or study history.
        conn.execute_batch("BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS civilization (id TEXT PRIMARY KEY CHECK(id='civilization'), data TEXT NOT NULL CHECK(json_valid(data))); PRAGMA user_version=2; COMMIT;")
            .map_err(err)?;
    }
    let check: String = conn
        .pragma_query_value(None, "quick_check", |r| r.get(0))
        .map_err(err)?;
    if check != "ok" {
        return Err(format!(
            "Database integrity check failed: {check}. Your database was not overwritten."
        ));
    }
    Ok(conn)
}
pub fn load(conn: &Connection) -> Result<Option<Value>> {
    let settings: Option<String> = conn
        .query_row(
            "SELECT data FROM settings WHERE id='preferences'",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(err)?;
    let Some(settings) = settings else {
        return Ok(None);
    };
    let revision: i64 = conn
        .query_row("SELECT revision FROM metadata WHERE id=1", [], |r| r.get(0))
        .map_err(err)?;
    let mut result = json!({"schemaVersion":2,"revision":revision,"settings":serde_json::from_str::<Value>(&settings).map_err(err)?,"timer":null});
    let civilization: Option<String> = conn
        .query_row(
            "SELECT data FROM civilization WHERE id='civilization'",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(err)?;
    if let Some(civilization) = civilization {
        result["civilization"] = serde_json::from_str(&civilization).map_err(err)?;
    } else {
        result["schemaVersion"] = json!(1);
    }
    for table in TABLES {
        let mut query = conn
            .prepare(&format!("SELECT data FROM {table} ORDER BY rowid"))
            .map_err(err)?;
        let rows = query
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(err)?;
        let mut values = Vec::new();
        for row in rows {
            values.push(serde_json::from_str::<Value>(&row.map_err(err)?).map_err(err)?);
        }
        result[table] = json!(values);
    }
    let timer: Option<String> = conn
        .query_row("SELECT data FROM timer WHERE id='active'", [], |r| r.get(0))
        .optional()
        .map_err(err)?;
    if let Some(timer) = timer {
        result["timer"] = serde_json::from_str(&timer).map_err(err)?;
    }
    Ok(Some(result))
}
pub fn save(conn: &mut Connection, data: &Value, expected: i64) -> Result<i64> {
    if data["schemaVersion"] != 2 {
        return Err("Unsupported data schema.".into());
    }
    let tx = conn
        .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(err)?;
    let current: i64 = tx
        .query_row("SELECT revision FROM metadata WHERE id=1", [], |r| r.get(0))
        .map_err(err)?;
    if current != expected {
        return Err(
            "ATLAS was changed in another window. Export unsaved work, then reload.".into(),
        );
    }
    tx.execute_batch("PRAGMA defer_foreign_keys=ON;")
        .map_err(err)?;
    for table in TABLES {
        let rows = data[table]
            .as_array()
            .ok_or_else(|| format!("Missing collection: {table}"))?;
        let mut ids = std::collections::HashSet::new();
        let mut cells = std::collections::HashSet::new();
        for row in rows {
            let id = string(row, "id")?;
            if !ids.insert(id.to_string()) {
                return Err(format!("Duplicate ID in {table}"));
            }
            if table == "nodes" {
                let cell = (number(row, "x")?, number(row, "y")?);
                if !cells.insert(cell) {
                    return Err("Duplicate map cell".into());
                }
            }
            let body = serde_json::to_string(row).map_err(err)?;
            let old: Option<String> = tx
                .query_row(
                    &format!("SELECT data FROM {table} WHERE id=?1"),
                    [id],
                    |r| r.get(0),
                )
                .optional()
                .map_err(err)?;
            if old.as_deref() == Some(&body) {
                continue;
            }
            match table {
                "subjects" | "countries" => {
                    tx.execute(&format!("INSERT INTO {table}(id,name,color,data) VALUES (?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,data=excluded.data"),params![id,string(row,"name")?,string(row,"color")?,body]).map_err(err)?;
                }
                "topics" => {
                    tx.execute("INSERT INTO topics(id,subject_id,parent_id,mastery,data) VALUES(?1,?2,?3,?4,?5) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,parent_id=excluded.parent_id,mastery=excluded.mastery,data=excluded.data",params![id,string(row,"subjectId")?,optional(row,"parentId"),number(row,"mastery")?,body]).map_err(err)?;
                }
                "nodes" => {
                    tx.execute("INSERT INTO nodes(id,topic_id,country_id,x,y,data) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET topic_id=excluded.topic_id,country_id=excluded.country_id,x=excluded.x,y=excluded.y,data=excluded.data",params![id,string(row,"topicId")?,optional(row,"countryId"),number(row,"x")?,number(row,"y")?,body]).map_err(err)?;
                }
                "relations" => {
                    tx.execute("INSERT INTO relations(id,from_id,to_id,data) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET from_id=excluded.from_id,to_id=excluded.to_id,data=excluded.data",params![id,string(row,"fromId")?,string(row,"toId")?,body]).map_err(err)?;
                }
                "sessions" => {
                    tx.execute("INSERT INTO sessions(id,topic_id,subtopic_id,started_at,duration_ms,data) VALUES(?1,?2,?3,?4,?5,?6) ON CONFLICT(id) DO UPDATE SET topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,started_at=excluded.started_at,duration_ms=excluded.duration_ms,data=excluded.data",params![id,string(row,"topicId")?,optional(row,"subtopicId"),number(row,"startedAt")?,number(row,"durationMs")?,body]).map_err(err)?;
                }
                "tests" => {
                    tx.execute("INSERT INTO tests(id,topic_id,date,data) VALUES(?1,?2,?3,?4) ON CONFLICT(id) DO UPDATE SET topic_id=excluded.topic_id,date=excluded.date,data=excluded.data",params![id,string(row,"topicId")?,number(row,"date")?,body]).map_err(err)?;
                }
                _ => unreachable!(),
            }
        }
    }
    // Delete dependents first. Foreign keys are checked only after the complete snapshot is written.
    for table in [
        "tests",
        "sessions",
        "relations",
        "nodes",
        "topics",
        "countries",
        "subjects",
    ] {
        let ids: std::collections::HashSet<&str> = data[table]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|v| v["id"].as_str())
            .collect();
        let previous: Vec<String> = {
            let mut stmt = tx
                .prepare(&format!("SELECT id FROM {table}"))
                .map_err(err)?;
            let rows = stmt.query_map([], |r| r.get::<_, String>(0)).map_err(err)?;
            rows.collect::<std::result::Result<Vec<_>, _>>()
                .map_err(err)?
        };
        for id in previous {
            if !ids.contains(id.as_str()) {
                tx.execute(&format!("DELETE FROM {table} WHERE id=?1"), [id])
                    .map_err(err)?;
            }
        }
    }
    tx.execute("INSERT INTO settings(id,data) VALUES('preferences',?1) ON CONFLICT(id) DO UPDATE SET data=excluded.data",[serde_json::to_string(&data["settings"]).map_err(err)?]).map_err(err)?;
    tx.execute("INSERT INTO civilization(id,data) VALUES('civilization',?1) ON CONFLICT(id) DO UPDATE SET data=excluded.data",[serde_json::to_string(&data["civilization"]).map_err(err)?]).map_err(err)?;
    tx.execute("DELETE FROM timer", []).map_err(err)?;
    if !data["timer"].is_null() {
        let t = &data["timer"];
        tx.execute(
            "INSERT INTO timer(id,topic_id,subtopic_id,data) VALUES('active',?1,?2,?3)",
            params![
                string(t, "topicId")?,
                optional(t, "subtopicId"),
                serde_json::to_string(t).map_err(err)?
            ],
        )
        .map_err(err)?;
    }
    tx.execute("UPDATE metadata SET revision=?1 WHERE id=1", [current + 1])
        .map_err(err)?;
    tx.commit().map_err(err)?;
    Ok(current + 1)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn transaction_and_reopen() {
        let path = std::env::temp_dir().join(format!("atlas-test-{}.sqlite", std::process::id()));
        let mut c = open(&path).unwrap();
        let data = json!({"schemaVersion":2,"subjects":[{"id":"s","name":"Math","color":"#ff0000"}],"countries":[],"topics":[{"id":"t","subjectId":"s","parentId":null,"mastery":2}],"nodes":[],"relations":[],"sessions":[],"tests":[],"settings":{"id":"preferences"},"civilization":{"id":"civilization"},"timer":null});
        assert_eq!(save(&mut c, &data, 0).unwrap(), 1);
        assert!(save(&mut c, &data, 0).is_err());
        let mut bad = data.clone();
        bad["topics"][0]["subjectId"] = json!("missing");
        assert!(save(&mut c, &bad, 1).is_err());
        assert_eq!(load(&c).unwrap().unwrap()["topics"][0]["subjectId"], "s");
        drop(c);
        let c = open(&path).unwrap();
        assert_eq!(load(&c).unwrap().unwrap()["revision"], 1);
        drop(c);
        let _ = fs::remove_file(path);
    }
    #[test]
    fn migrates_version_one_without_losing_topics() {
        let path =
            std::env::temp_dir().join(format!("atlas-migration-{}.sqlite", std::process::id()));
        let mut c = open(&path).unwrap();
        let data = json!({"schemaVersion":2,"subjects":[{"id":"s","name":"Physics","color":"#668495"}],"countries":[],"topics":[{"id":"t","subjectId":"s","parentId":null,"mastery":2}],"nodes":[],"relations":[],"sessions":[],"tests":[],"settings":{"id":"preferences"},"civilization":{"id":"civilization"},"timer":null});
        save(&mut c, &data, 0).unwrap();
        c.execute_batch("DROP TABLE civilization; PRAGMA user_version=1;")
            .unwrap();
        drop(c);
        let c = open(&path).unwrap();
        let loaded = load(&c).unwrap().unwrap();
        assert_eq!(loaded["schemaVersion"], 1);
        assert_eq!(loaded["topics"][0]["id"], "t");
        let version: i64 = c
            .pragma_query_value(None, "user_version", |r| r.get(0))
            .unwrap();
        assert_eq!(version, 2);
        drop(c);
        let _ = std::fs::remove_file(&path);
    }
}
