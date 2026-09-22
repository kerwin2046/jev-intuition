export type Primitive = "choice" | "score" | "noul";
export type BeatKind = "route" | "compact" | "gate";

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string | null>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
};

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type NoulAnswer = {
  type: "noul";
  noul: number;
};

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export type IntuitionBeat = {
  id: string;
  t: number;
  turn: number;
  kind: BeatKind;
  label: string;
  intent: string;
  statePreview: string;
  state: string;
  questionKey: string;
  question: Question;
  answer: Answer;
  latencyMs: number;
  acted: string;
};

export type Session = {
  id: string;
  title: string;
  beats: IntuitionBeat[];
};
