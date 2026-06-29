export function encodeNativeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export function decodeNativeMessages(buffer, options = {}) {
  const messages = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const messageLength = buffer.readUInt32LE(offset);
    const bodyStart = offset + 4;
    const bodyEnd = bodyStart + messageLength;

    if (bodyEnd > buffer.length) {
      break;
    }

    const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
    messages.push(JSON.parse(body));
    offset = bodyEnd;
  }

  if (options.includeRemainder) {
    return {
      messages,
      remainder: buffer.subarray(offset),
    };
  }

  return messages;
}
