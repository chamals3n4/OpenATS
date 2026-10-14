"use client";

import { createContext, useContext } from "react";
import { OFFER_ONLY_VARS, SAMPLE, VARS } from "../../../_lib/template-form-constants";

export interface VariableGroup {
  heading: string;
  vars: { name: string; sample: string }[];
}

const toVars = (names: string[]) => names.map((name) => ({ name, sample: SAMPLE[name] ?? name }));

/** The variables of an ordinary email template. */
const DEFAULT_GROUPS: VariableGroup[] = [
  { heading: "Works in any email", vars: toVars(VARS.filter((v) => !OFFER_ONLY_VARS.has(v))) },
  { heading: "Offer letters only", vars: toVars(VARS.filter((v) => OFFER_ONLY_VARS.has(v))) },
];

const VariablesContext = createContext<VariableGroup[]>(DEFAULT_GROUPS);

/** Use a different set of variables */
export const VariablesProvider = VariablesContext.Provider;

export function useVariableGroups(): VariableGroup[] {
  return useContext(VariablesContext);
}

/** Variable name to sample value, for previews. */
export function useVariableSamples(): Record<string, string> {
  const groups = useVariableGroups();
  return Object.fromEntries(groups.flatMap((g) => g.vars.map((v) => [v.name, v.sample])));
}
