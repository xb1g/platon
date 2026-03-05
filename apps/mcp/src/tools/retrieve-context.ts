export const retrieveContext = async (args: any) => {
  // TODO: Call API server
  return {
    content: [{ type: "text", text: `Context for query: ${args.query}` }],
  };
};
