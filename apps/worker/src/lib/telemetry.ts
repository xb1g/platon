export const logJobStart = (jobId: string, name: string) => {
  console.log(`[Telemetry] Job ${name} (${jobId}) started`);
};

export const logJobComplete = (jobId: string, name: string) => {
  console.log(`[Telemetry] Job ${name} (${jobId}) completed`);
};
