import { GET as runAcceptanceStep } from "@/app/api/admin/beta-acceptance/route";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<{
  step?: string | string[];
  run?: string | string[];
}>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BetaAcceptancePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const url = new URL(
    "https://acceptance.preview.invalid/api/admin/beta-acceptance",
  );

  const step = first(params.step);
  const run = first(params.run);

  if (step) url.searchParams.set("step", step);
  if (run) url.searchParams.set("run", run);

  const result = await runAcceptanceStep(new Request(url));

  let body: unknown;
  try {
    body = await result.json();
  } catch {
    body = {
      ok: false,
      error: "acceptance_adapter_invalid_response",
      status: result.status,
    };
  }

  return (
    <pre id="arbor-beta-acceptance">
      {JSON.stringify(body)}
    </pre>
  );
}
