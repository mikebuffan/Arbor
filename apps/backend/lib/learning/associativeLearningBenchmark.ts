/** All data are synthetic. Split by whole utterance, not by model-generated paraphrase. */
import {
  newPathwayLearningState, predictLearnedRoute, trainVerifiedPathwayExample,
  type LearnedRoute,
} from "./associativeLearningLab";
export type Case = { text: string; route: LearnedRoute };
export const TRAIN: readonly Case[] = [
  { text: "My nickname is River", route: "identity" },
  { text: "Call me River", route: "identity" },
  { text: "River is my nickname", route: "identity" },
  { text: "You got my nickname wrong", route: "identity" },
  { text: "The nickname belongs to me", route: "identity" },
  { text: "I'm called Robin", route: "identity" },
  { text: "What name should you call me?", route: "identity" },
  { text: "My name is Robin", route: "identity" },
  { text: "Go finish the list", route: "objective" },
  { text: "Continue the work", route: "objective" },
  { text: "List and go", route: "objective" },
  { text: "What task is next?", route: "objective" },
  { text: "Do the next step", route: "objective" },
  { text: "Resume our objective", route: "objective" },
  { text: "Finish that task", route: "objective" },
  { text: "Keep going on the work", route: "objective" },
  { text: "Celebrate that win", route: "celebration" },
  { text: "We fixed the bug hooray", route: "celebration" },
  { text: "That's a victory", route: "celebration" },
  { text: "We did it yay", route: "celebration" },
  { text: "Nice job celebrate", route: "celebration" },
  { text: "That worked let's cheer", route: "celebration" },
  { text: "A win worth celebrating", route: "celebration" },
  { text: "Good news we succeeded", route: "celebration" },
];
export const HOLDOUT: readonly Case[] = [
  { text: "My nickname is Sparrow", route: "identity" },
  { text: "Sparrow is my nickname, not yours", route: "identity" },
  { text: "What is my name?", route: "identity" },
  { text: "You called me the wrong name", route: "identity" },
  { text: "Keep going to the next task", route: "objective" },
  { text: "Please continue the list", route: "objective" },
  { text: "Go finish that work", route: "objective" },
  { text: "Resume the next step", route: "objective" },
  { text: "Yay that bug is fixed", route: "celebration" },
  { text: "Let's celebrate a victory", route: "celebration" },
  { text: "What a win hooray", route: "celebration" },
  { text: "Nice job we succeeded", route: "celebration" },
];
export function runAssociativeLearningBenchmark() {
  const scope = { userId: "synthetic-a", projectId: "synthetic-p" };
  let state = newPathwayLearningState(scope.userId, scope.projectId);
  for (let index = 0; index < TRAIN.length; index++) {
    state = trainVerifiedPathwayExample(state, {
      ...scope, ...TRAIN[index], verifiedReceipt: `synthetic_verified_label:${index}`,
    });
  }
  const memorized = new Map(TRAIN.map(item => [item.text.toLowerCase(), item.route]));
  const results = HOLDOUT.map(item => {
    const predicted = predictLearnedRoute(state, { ...scope, text: item.text });
    const exactCue = memorized.get(item.text.toLowerCase()) ?? null;
    return { input: item.text, expected: item.route, exactCue, predicted: predicted.route,
      abstained: predicted.abstained, correct: predicted.route === item.route };
  });
  return { trainCount: TRAIN.length, holdoutCount: HOLDOUT.length,
    baselineCorrect: results.filter(row => row.exactCue === row.expected).length,
    learnedCorrect: results.filter(row => row.correct).length,
    abstentions: results.filter(row => row.abstained).length,
    results,
    scope,
    state,
  };
}