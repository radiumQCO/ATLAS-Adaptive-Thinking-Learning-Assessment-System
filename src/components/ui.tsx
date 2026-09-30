import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';
import { ArrowUpRight, ChevronDown, Plus, X } from 'lucide-react';
import { masteryNames, type Mastery, type Topic } from '../lib/model';
import { selectTopic, setMastery, useAtlas } from '../app/store';
export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Select({
  children,
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`select-wrap ${className}`}>
      <select {...props}>{children}</select>
      <ChevronDown size={14} />
    </span>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const d = ref.current!;
    const previous = document.activeElement as HTMLElement;
    d.showModal();
    return () => {
      d.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''} ${className}`}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-top">
        <h2 id={id}>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  danger = false,
  action = 'Confirm',
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  action?: string;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-copy">{children}</div>
      <div className="dialog-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {action}
        </Button>
      </div>
    </Modal>
  );
}
export function MasterySquare({
  value,
  onClick,
  label,
  size = 22,
}: {
  value: Mastery;
  onClick?: () => void;
  label?: string;
  size?: number;
}) {
  const square = (
    <span
      className={`mastery-square state-${value}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="mastery-fill" />
    </span>
  );
  return onClick ? (
    <button
      className="mastery-control"
      aria-label={label ?? masteryNames[value]}
      title={label ?? masteryNames[value]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {square}
    </button>
  ) : (
    square
  );
}
export function SubjectLabel({ id }: { id: string }) {
  const { data } = useAtlas();
  const s = data?.subjects.find((s) => s.id === id);
  return (
    <span className="subject-label">
      <i style={{ background: s?.color }} />
      {s?.name ?? 'Unknown subject'}
    </span>
  );
}
export function TopicRow({
  topic,
  extra,
  depth = 0,
}: {
  topic: Topic;
  extra?: ReactNode;
  depth?: number;
}) {
  return (
    <div className="topic-row">
      <MasterySquare
        value={topic.mastery}
        label={`${topic.name}: ${masteryNames[topic.mastery]}. Change to ${masteryNames[(topic.mastery + 1) % 4]}`}
        onClick={() => setMastery(topic.id, ((topic.mastery + 1) % 4) as Mastery)}
      />
      <button className="topic-name" onClick={() => selectTopic(topic.id)}>
        <span>{topic.name}</span>
        {depth > 0 && (
          <small>
            {depth === 1 ? 'SUBTOPIC' : depth === 2 ? 'SUB-SUBTOPIC' : 'LEVEL ' + (depth + 1)}
          </small>
        )}
      </button>
      <SubjectLabel id={topic.subjectId} />
      {extra}
      <button
        className="row-open"
        aria-label={`Open ${topic.name}`}
        onClick={() => selectTopic(topic.id)}
      >
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark">
        <Plus size={22} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{children}</h2>
      {aside}
    </div>
  );
}
