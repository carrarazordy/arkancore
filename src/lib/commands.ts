export const ArkanCommands = {
  init: (router: any) => {
    console.log("[COMMANDS] Initialized");
    return () => console.log("[COMMANDS] Cleanup");
  }
};
