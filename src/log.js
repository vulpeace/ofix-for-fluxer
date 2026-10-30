for (const method of ["log", "error"]) {
  const original = console[method];
  console[method] = (...args) =>
    original(`[${new Date().toISOString()}]`, ...args);
}
