export type ArborSubsystem = "arbor" | "annabelle";
export type ArborChannel = "text" | "voice";

export type CanonicalArborOutput = {
  text: string;
  activeSubsystem: ArborSubsystem;
  channel: ArborChannel;
  turnId: string;
};
