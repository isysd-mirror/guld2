import { apiUrl } from "../lib/api.js";
import { publicItems } from "../lib/catalog.js";

/** @typedef {"name" | "committed_at" | "topics"} SortKey */
/** @typedef {"asc" | "desc"} SortDir */

/**
 * @typedef {object} RepoRow
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {string} href
 * @property {string} [activity]
 * @property {number} [pinned]
 * @property {string[]} topics
 * @property {string} [committed_at]
 * @property {string} [commit_subject]
 * @property {string} [clone_url]
 */

const CATALOG_SRC = "/data/software.json";

/** @param {string | undefined} iso */
function formatCommitDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const delta = Date.now() - date.getTime();
  const day = 86_400_000;
  if (delta < day) {
    const hours = Math.max(1, Math.floor(delta / 3_600_000));
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (delta < 30 * day) {
    const days = Math.floor(delta / day);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** @param {RepoRow} a @param {RepoRow} b @param {SortKey} key @param {SortDir} dir */
function compareRows(a, b, key, dir) {
  const sign = dir === "asc" ? 1 : -1;
  if (key === "committed_at") {
    const av = a.committed_at || "";
    const bv = b.committed_at || "";
    if (!av && !bv) return a.title.localeCompare(b.title);
    if (!av) return 1;
    if (!bv) return -1;
    return sign * av.localeCompare(bv) || a.title.localeCompare(b.title);
  }
  if (key === "topics") {
    const av = (a.topics[0] || "").toLowerCase();
    const bv = (b.topics[0] || "").toLowerCase();
    return sign * av.localeCompare(bv) || a.title.localeCompare(b.title);
  }
  return sign * a.title.localeCompare(b.title);
}

/** Software catalog — merges shelf JSON with live git metadata from `/api/v1/repos`. */
export class GuldSoftware extends HTMLElement {
  /** @type {RepoRow[]} */
  #rows = [];
  /** @type {SortKey} */
  #sortKey = "committed_at";
  /** @type {SortDir} */
  #sortDir = "desc";

  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.setAttribute("role", "region");
    if (!this.getAttribute("aria-label")) {
      this.setAttribute("aria-label", "Software");
    }
    this.#load();
  }

  async #load() {
    this.replaceChildren();
    const status = document.createElement("p");
    status.className = "catalog__status";
    status.textContent = "Loading…";
    this.append(status);

    const fetchImpl = this.fetchImpl || globalThis.fetch;
    try {
      const [shelfRes, apiRes] = await Promise.all([
        fetchImpl(CATALOG_SRC, { headers: { Accept: "application/json" } }),
        fetchImpl(apiUrl("/api/v1/repos"), { headers: { Accept: "application/json" } }),
      ]);
      if (!shelfRes.ok) throw new Error(`shelf HTTP ${shelfRes.status}`);
      const shelf = await shelfRes.json();
      const shelfItems = publicItems(shelf);
      /** @type {Map<string, Record<string, unknown>>} */
      const apiByName = new Map();
      if (apiRes.ok) {
        const body = await apiRes.json();
        const items = Array.isArray(body?.items) ? body.items : [];
        for (const item of items) {
          if (item?.name) apiByName.set(String(item.name), item);
        }
      } else {
        console.warn("guld-software: repos API unavailable", apiRes.status);
      }

      this.#rows = shelfItems.map((item) => {
        const api = apiByName.get(String(item.id)) || apiByName.get(String(item.title));
        const head = api?.head && typeof api.head === "object" ? api.head : null;
        return {
          id: String(item.id),
          title: String(item.title),
          summary: String(item.summary || ""),
          href: String(item.href),
          activity: item.activity ? String(item.activity) : undefined,
          pinned: typeof item.pinned === "number" ? item.pinned : undefined,
          topics: Array.isArray(item.topics) ? item.topics.map(String) : [],
          committed_at: head?.committed_at ? String(head.committed_at) : undefined,
          commit_subject: head?.subject ? String(head.subject) : undefined,
          clone_url: api?.clone_url ? String(api.clone_url) : undefined,
        };
      });
      this.#render();
    } catch (err) {
      status.textContent = "Could not load repositories.";
      console.warn("guld-software:", err);
    }
  }

  #render() {
    this.replaceChildren();
    const pinned = this.#rows
      .filter((row) => typeof row.pinned === "number")
      .sort((a, b) => (a.pinned || 0) - (b.pinned || 0));
    if (pinned.length) {
      this.append(this.#pinnedSection(pinned));
    }
    this.append(this.#tableSection());
  }

  /** @param {RepoRow[]} items */
  #pinnedSection(items) {
    const section = document.createElement("section");
    section.className = "software-section";
    section.setAttribute("aria-labelledby", "software-pinned-heading");

    const heading = document.createElement("h2");
    heading.id = "software-pinned-heading";
    heading.textContent = "Pinned";

    const list = document.createElement("ul");
    list.className = "software-pins";
    for (const item of items) {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "software-pin";
      link.href = item.href;
      const name = document.createElement("span");
      name.className = "software-pin__name";
      name.textContent = item.title;
      const summary = document.createElement("span");
      summary.className = "software-pin__summary";
      summary.textContent = item.summary;
      link.append(name, summary);
      li.append(link);
      list.append(li);
    }
    section.append(heading, list);
    return section;
  }

  #tableSection() {
    const section = document.createElement("section");
    section.className = "software-section";
    section.setAttribute("aria-labelledby", "software-repos-heading");

    const heading = document.createElement("h2");
    heading.id = "software-repos-heading";
    heading.textContent = "Repositories";

    const count = document.createElement("p");
    count.className = "software-section__lead";
    count.textContent =
      this.#rows.length === 1
        ? "1 package. Clone from this node’s `/repos/<name>.git`."
        : `${this.#rows.length} packages. Clone from this node’s \`/repos/<name>.git\`.`;

    section.append(heading, count);

    if (!this.#rows.length) {
      const empty = document.createElement("p");
      empty.className = "catalog__status";
      empty.textContent = "Nothing listed yet.";
      section.append(empty);
      return section;
    }

    const wrap = document.createElement("div");
    wrap.className = "software-table";

    const table = document.createElement("table");
    table.setAttribute("aria-labelledby", "software-repos-heading");

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    /** @type {Array<{ key: SortKey | null, label: string, className?: string }>} */
    const columns = [
      { key: "name", label: "Name" },
      { key: null, label: "Description", className: "software-table__desc" },
      { key: "topics", label: "Topics" },
      { key: "committed_at", label: "Last commit" },
    ];
    for (const col of columns) {
      const th = document.createElement("th");
      th.scope = "col";
      if (col.className) th.className = col.className;
      if (col.key) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "software-table__sort";
        button.textContent = col.label;
        if (this.#sortKey === col.key) {
          th.setAttribute("aria-sort", this.#sortDir === "asc" ? "ascending" : "descending");
          button.dataset.active = "true";
        }
        const key = col.key;
        button.addEventListener("click", () => {
          if (this.#sortKey === key) {
            this.#sortDir = this.#sortDir === "asc" ? "desc" : "asc";
          } else {
            this.#sortKey = key;
            this.#sortDir = key === "name" || key === "topics" ? "asc" : "desc";
          }
          this.#render();
        });
        th.append(button);
      } else {
        th.textContent = col.label;
      }
      hr.append(th);
    }
    thead.append(hr);

    const tbody = document.createElement("tbody");
    const ordered = [...this.#rows].sort((a, b) =>
      compareRows(a, b, this.#sortKey, this.#sortDir),
    );
    for (const row of ordered) {
      tbody.append(this.#tableRow(row));
    }

    table.append(thead, tbody);
    wrap.append(table);
    section.append(wrap);
    return section;
  }

  /** @param {RepoRow} item */
  #tableRow(item) {
    const tr = document.createElement("tr");
    if (item.activity === "inactive") tr.classList.add("is-inactive");

    const nameTd = document.createElement("td");
    const nameLink = document.createElement("a");
    nameLink.className = "software-table__name";
    nameLink.href = item.href;
    nameLink.textContent = item.title;
    nameTd.append(nameLink);

    const descTd = document.createElement("td");
    descTd.className = "software-table__desc";
    descTd.textContent = item.summary;

    const topicsTd = document.createElement("td");
    topicsTd.className = "software-table__topics";
    topicsTd.textContent = item.topics.length ? item.topics.join(", ") : "—";

    const commitTd = document.createElement("td");
    commitTd.className = "software-table__commit";
    const when = document.createElement("time");
    if (item.committed_at) {
      when.dateTime = item.committed_at;
      when.textContent = formatCommitDate(item.committed_at);
      when.title = item.commit_subject
        ? `${item.commit_subject} · ${item.committed_at}`
        : item.committed_at;
    } else {
      when.textContent = "—";
    }
    commitTd.append(when);

    tr.append(nameTd, descTd, topicsTd, commitTd);
    return tr;
  }
}

if (!customElements.get("guld-software")) {
  customElements.define("guld-software", GuldSoftware);
}
