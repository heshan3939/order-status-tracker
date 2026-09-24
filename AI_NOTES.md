# AI Notes

## Tools used

**Antigravity (AI coding agent inside the IDE).** I used it in Planning mode for the
bigger tasks: scaffolding the backend, the MySQL layer and transaction logic, the API
routes, the API tests, and the React frontend. I used Fast mode for a small task, the
seed script.
The rules I gave it are in `AGENTS.md`.

**Claude (in a chat window).** I used it to plan the approach before writing any code:
working through how to handle duplicate and out-of-order events, choosing the
transition rules, drafting the prompts I gave the agent, and helping me fix
environment problems (Git, PowerShell, XAMPP). The timeline-based design for
out-of-order events came out of that planning conversation, and I then made sure I
understood it before building on it.

For most phases I wrote the prompts from my own rules, so the agent implemented a design
I had already decided on. I didn't let it run git commands, and I made every commit
myself after reading the diff.

## Where the AI got it wrong

**1. The agent worked in a different folder from my Git repo.** My repository lived in
`C:\Users\User\order-status-tracker`, but the folder open in Antigravity was a separate
copy on the Desktop, so the agent created the `backend` project there. I noticed when
`cd backend` failed in my terminal even though I could see the folder in the editor, and
earlier when `git commit` said there was nothing to commit. I found the real path with
"Copy Path", copied the project into the repo folder, reopened that folder in the IDE,
and deleted the Desktop copy. This was more a workspace mix-up than a coding error, and
it made me check the workspace path at the start of each session after that.



## What I wrote myself

- `AGENTS.md`, `.gitignore` and this file, by hand.
- The rules for the status flow (which transitions are valid, that events are sorted by
  timestamp instead of arrival order, what counts as a duplicate, which HTTP codes
  to return), which the agent then implemented.
- The database schema, which I specified in the prompt column by column, and the
  transaction steps (lock the order row, check for duplicates, validate the whole
  timeline, then write).
- Manual testing of the API in PowerShell before writing the automated tests, including
  duplicates, out-of-order events and an invalid cancel.
- The README, including the design decisions.


Most of the boilerplate (project setup, the Express wiring, the React components and the
first version of the tests) was written by the agent from my prompts, and I reviewed each
diff before committing.