export const getSimilarFailures = async (args: any) => {
  // TODO: Call API server
  return {
    content: [{ type: "text", text: `Similar failures for: ${args.error}` }],
  };
};
