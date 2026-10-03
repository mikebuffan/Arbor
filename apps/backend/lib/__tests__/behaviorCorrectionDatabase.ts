/** Atomic predicate-aware storage fixture; no external database or services. */
export class BehaviorCorrectionDatabase {
  tables: Record<string, any[]> = { memory_items: [], memory_pending: [] };
  calls: { table: string; mode: string; filters: any[]; payload: any }[] = [];
  readHook?: (table: string, snapshot: any[]) => Promise<void>;
  writeHook?: (table: string, payload: any) => Promise<void>;
  afterWrite?: (table: string, payload: any) => void;
  fault?: (table: string, mode: string) => unknown;
  returnedRow?: (table: string, row: any) => any;
  from(table: string) {
    let mode = "read", payload: any, options: any, bound = Infinity, single = false;
    const filters: any[] = [];
    const orders: [string, any][] = [];
    const fixture = this;
    const clone = (v: any) => structuredClone(v);
    const matches = (row: any) => filters.every(([op, k, v]) => {
      if (op === "contains") return Object.entries(v).every(([key, value]) => row[k]?.[key] === value);
      const actual = k === "value" && typeof v === "string" ? JSON.stringify(row[k]) : row[k];
      return op === "in" ? v.includes(actual) : actual === v;
    });
    async function execute() {
      fixture.calls.push({ table, mode, filters: clone(filters), payload: clone(payload) });
      const error = fixture.fault?.(table, mode);
      if (error) return { data: null, error };
      const rows = fixture.tables[table] ?? [];
      let data: any[];
      if (mode === "read") {
        const valueAt = (row: any, key: string) => key.includes("->>")
          ? row[key.split("->>")[0]]?.[key.split("->>")[1]] : row[key];
        data = rows.filter(matches).sort((a,b) => {
          for (const [key, options] of orders) {
            const left=valueAt(a,key), right=valueAt(b,key);
            if (left === right) continue;
            if (left == null) return options?.nullsFirst ? -1 : 1;
            if (right == null) return options?.nullsFirst ? 1 : -1;
            return (left < right ? -1 : 1) * (options?.ascending === false ? -1 : 1);
          }
          return 0;
        }).slice(0, bound).map(clone);
        await fixture.readHook?.(table, data);
      } else {
        await fixture.writeHook?.(table, payload);
        if (mode === "update") {
          data = [];
          for (const row of rows) if (matches(row)) {
            Object.assign(row, clone(payload));
            data.push(clone(row));
          }
        } else if (mode === "insert" || mode === "upsert") {
          const duplicate = rows.find(row => table === "memory_items"
            ? row.user_id === payload.user_id && row.key === payload.key : row.id === payload.id);
          if (duplicate && !(mode === "upsert" && options?.ignoreDuplicates))
            return { data: null, error: { code: "23505" } };
          if (duplicate) data = [];
          else {
            const row = { id: payload.id ?? "row-" + (rows.length + 1), created_at: "2026-10-02T00:00:00Z", ...clone(payload) };
            rows.push(row); fixture.tables[table] = rows; data = [clone(row)];
          }
        } else throw new Error("unsupported fixture mutation");
        fixture.afterWrite?.(table, payload);
      }
      data = data.map(row => fixture.returnedRow?.(table, row) ?? row);
      return { data: single ? data[0] ?? null : data, error: null };
    }
    const q: any = {
      select: () => q, eq: (k: string,v: any) => { filters.push(["eq",k,v]); return q; },
      is: (k: string,v: any) => { filters.push(["eq",k,v]); return q; },
      in: (k: string,v: any) => { filters.push(["in",k,v]); return q; },
      contains: (k: string,v: any) => { filters.push(["contains",k,v]); return q; },
      order: (key: string,options: any) => { orders.push([key,options]); return q; }, limit: (n: number) => { bound=n; return q; },
      maybeSingle: () => { single=true; return q; },
      update: (v: any) => { mode="update"; payload=v; return q; },
      insert: (v: any) => { mode="insert"; payload=v; return q; },
      upsert: (v: any,o: any) => { mode="upsert"; payload=v; options=o; return q; },
      then: (resolve: any,reject: any) => execute().then(resolve,reject),
    };
    return q;
  }
}
