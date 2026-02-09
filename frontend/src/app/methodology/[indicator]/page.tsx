import { notFound } from "next/navigation";
import Link from "next/link";
import fs from "fs";
import path from "path";

interface IndicatorContent {
  name: string;
  description: string;
  whatItMeasures: string;
  parameters: Record<string, string>;
  howToRead: string;
  signalRules: string;
  limitations: string;
  evidence: string;
}

function loadIndicatorContent(slug: string): IndicatorContent | null {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "content",
      "indicators",
      `${slug}.json`
    );
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export default async function IndicatorMethodologyPage({
  params,
}: {
  params: Promise<{ indicator: string }>;
}) {
  const { indicator } = await params;
  const content = loadIndicatorContent(indicator);

  if (!content) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/methodology"
        className="text-sm text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Back to Methodology
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.name}</h1>
      <p className="text-gray-600 mb-8">{content.description}</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            What It Measures
          </h2>
          <p className="text-gray-700">{content.whatItMeasures}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Parameters
          </h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Parameter
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Value & Rationale
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(content.parameters).map(([key, value]) => (
                  <tr key={key} className="border-b border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {key}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            How to Read
          </h2>
          <p className="text-gray-700 whitespace-pre-line">
            {content.howToRead}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Signal Rules
          </h2>
          <p className="text-gray-700 whitespace-pre-line">
            {content.signalRules}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Evidence & Backtesting
          </h2>
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-800 whitespace-pre-line">
              {content.evidence}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Limitations
          </h2>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-sm text-amber-800 whitespace-pre-line">
              {content.limitations}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
