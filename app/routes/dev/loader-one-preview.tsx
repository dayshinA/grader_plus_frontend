import { LoaderOne } from "~/components/ui/loader-one";

export default function LoaderOnePreview() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 sm:p-10">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        LoaderOne — manual QA preview
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Default</h2>
        <LoaderOne />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Custom announced label (for screen readers)
        </h2>
        <LoaderOne label="Loading submissions" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Inline usage next to text (className composition)
        </h2>
        <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <LoaderOne className="scale-75" />
          <span>Fetching results…</span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">On a dark surface</h2>
        <div className="flex items-center justify-center rounded-lg bg-gray-900 p-8">
          <LoaderOne />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Screen reader check</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The dots are <code>aria-hidden</code>; the wrapper carries <code>role=&quot;status&quot;</code>{" "}
          and <code>aria-live=&quot;polite&quot;</code> with a visually-hidden label (default &quot;Loading&quot;,
          overridable via the <code>label</code> prop) so assistive tech announces the busy state.
        </p>
      </section>
    </div>
  );
}
