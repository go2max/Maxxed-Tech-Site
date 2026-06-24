function sanitize(text) {
  return String(text).replaceAll(/(token|secret|password)=[^\s]+/gi, "$1=[redacted]");
}

export function redactStepResult(result) {
  return {
    ...result,
    stdout: sanitize(result.stdout),
    stderr: sanitize(result.stderr),
  };
}
