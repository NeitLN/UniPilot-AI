"use client";

import { useActionState } from "react";
import { updateProfile, type SettingsFormState } from "@/app/(app)/settings/actions";
import { FieldError } from "@/components/ui/FieldError";
import { FieldSuccess } from "@/components/ui/FieldSuccess";
import { Field, inputClass } from "@/components/ui/Field";

const INITIAL_STATE: SettingsFormState = { errors: {} };

export function SettingsForm({ initialFullName }: { initialFullName: string }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateProfile,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label="Full name">
        <input
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="e.g. Vo Viet Tien"
          defaultValue={initialFullName}
          className={inputClass(false)}
        />
      </Field>

      {state.formError && <FieldError>{state.formError}</FieldError>}
      {state.ok && <FieldSuccess>Saved.</FieldSuccess>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex min-h-11 w-fit items-center justify-center rounded-ctl bg-violet px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-deep disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
