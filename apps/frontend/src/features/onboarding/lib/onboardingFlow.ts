import type { Locality } from "@/lib/catalog/catalogSchemas"

export const INTEREST_GOAL = 3

type Stage = "locality" | "interests" | "profile"
type Overlay = "decision" | "exit"

export type OnboardingFlow = {
  stage: Stage
  locality: Locality | null
  interestIds: string[]
  categoryId: string
  overlay: Overlay | null
}

export type OnboardingCommand =
  | { type: "pick-place"; locality: Locality }
  | { type: "browse"; categoryId: string }
  | { type: "toggle"; interestId: string }
  | { type: "review" }
  | { type: "profile" }
  | { type: "back" }
  | { type: "exit" }
  | { type: "dismiss" }

export function startOnboarding(): OnboardingFlow {
  return {
    stage: "locality",
    locality: null,
    interestIds: [],
    categoryId: "",
    overlay: null,
  }
}

export function reviewOnboarding(state: OnboardingFlow) {
  return Boolean(state.locality && state.interestIds.length > 0)
}

/** The pick that fills the selection: the confirmation opens by itself after it. */
export function fillsSelection(state: OnboardingFlow, interestId: string) {
  return !state.interestIds.includes(interestId) && state.interestIds.length + 1 === INTEREST_GOAL
}

export function moveOnboarding(state: OnboardingFlow, command: OnboardingCommand): OnboardingFlow {
  switch (command.type) {
    case "pick-place":
      return state.stage === "locality" && !state.overlay
        ? { ...state, locality: command.locality, stage: "interests" }
        : state

    case "browse":
      return state.stage === "interests" && !state.overlay
        ? { ...state, categoryId: command.categoryId }
        : state

    case "toggle": {
      if (state.stage !== "interests" || state.overlay) return state
      if (state.interestIds.includes(command.interestId)) {
        return {
          ...state,
          interestIds: state.interestIds.filter((id) => id !== command.interestId),
        }
      }
      if (state.interestIds.length >= INTEREST_GOAL) return state
      const interestIds = [...state.interestIds, command.interestId]
      return fillsSelection(state, command.interestId) && state.locality
        ? { ...state, interestIds, overlay: "decision" }
        : { ...state, interestIds }
    }

    case "review":
      return state.stage === "interests" && !state.overlay && reviewOnboarding(state)
        ? { ...state, overlay: "decision" }
        : state

    case "profile":
      return state.stage === "interests" && state.overlay === "decision" && reviewOnboarding(state)
        ? { ...state, stage: "profile", overlay: null }
        : state

    case "back":
      if (state.overlay) return { ...state, overlay: null }
      if (state.stage === "profile") return { ...state, stage: "interests" }
      if (state.stage === "interests") return { ...state, stage: "locality" }
      return state

    case "exit":
      return state.overlay ? state : { ...state, overlay: "exit" }

    case "dismiss":
      return state.overlay ? { ...state, overlay: null } : state
  }
}
