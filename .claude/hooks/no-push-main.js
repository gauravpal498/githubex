// PreToolUse hook: blocks any shell command that pushes to main.
// Exit code 2 stops the tool call and sends stderr back to Claude.
let input = "";
process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
  const toolInput = JSON.parse(input).tool_input || {};
  const cmd = toolInput.command || "";
  // Only look inside the git push itself (up to ; & | or a newline), and only
  // at "main" as a whole ref, so "main-fix" or "no-push-main.js" don't match.
  if (/\bgit\s+push\b[^;&|\n]*[\s:]main(?![\w\-./])/.test(cmd)) {
    console.error("Pushing to main is blocked. Open a PR instead.");
    process.exit(2);
  }
});
