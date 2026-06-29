export function sendRuntimeMessage(message, options = {}) {
  const { timeoutMs = 10000, timeoutMessage = "Extension message timed out." } = options;
  return withTimeout(chrome.runtime.sendMessage(message), timeoutMs, timeoutMessage);
}

export function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}
