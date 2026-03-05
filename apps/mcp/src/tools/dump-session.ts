export const dumpSession = async (args: any) => {
  // TODO: Call API server
  return {
    content: [{ type: "text", text: `Session ${args.sessionId} dumped successfully.` }],
  };
};
