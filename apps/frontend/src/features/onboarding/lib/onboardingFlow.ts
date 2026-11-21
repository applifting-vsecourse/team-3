import type { Locality } from "@/lib/catalog/catalogSchemas"

export const INTEREST_GOAL = 3

type Stage = "locality" | "interests" | "profile"
type Overlay = "decision" | "exit"

export type OnboardingFlow = {
  stage: Stage
  locality: Locality | null
  interestIds: string[]
  categoryId: string
  name: string
  bio: string
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
  | { type: "edit-name"; name: string }
  | { type: "edit-bio"; bio: string }

export function startOnboarding(name: string): OnboardingFlow {
  return {
    stage: "locality",
    locality: null,
    interestIds: [],
    categoryId: "",
    name,
    bio: "",
    overlay: null,
  }
}

export function reviewOnboarding(state: OnboardingFlow) {
  return Boolean(state.locality && state.interestIds.length === INTEREST_GOAL)
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
      return {
        ...state,
        interestIds,
        overlay: interestIds.length === INTEREST_GOAL ? "decision" : null,
      }
    }

    case "review":
      return state.stage === "interests" && reviewOnboarding(state)
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

    case "edit-name":
      return state.stage === "profile" ? { ...state, name: command.name } : state

    case "edit-bio":
      return state.stage === "profile" ? { ...state, bio: command.bio } : state
  }
}
