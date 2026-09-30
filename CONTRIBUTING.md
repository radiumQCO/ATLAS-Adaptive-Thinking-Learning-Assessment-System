# Contributing to ATLAS

Thanks for taking a look. ATLAS is still a small personal project, so clear bug reports and focused changes help a lot.

## Found a problem?

Open a GitHub issue with:

- what you expected;
- what actually happened;
- steps to reproduce it;
- your Windows version and ATLAS version.

Please don't attach your personal notebook export or database to a public issue. A screenshot with private topics hidden is usually enough.

## Want to change the code?

1. Fork the repository and create a branch for one feature or fix.
2. Run **npm ci** and **npm run desktop:dev**.
3. Keep the interface readable and the core notebook useful even when Civilization is disabled.
4. Run **npm test**, **npm run build**, and the relevant browser tests.
5. Explain the change in your pull request and include a screenshot if you changed the UI.

I prefer small pull requests I can understand and test. If you're planning a big new system, open an issue first so we can talk about how it fits ATLAS.
