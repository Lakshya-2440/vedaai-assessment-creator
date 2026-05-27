"use client";

import { useAssignmentStore } from "@/store/assignment-store";
import { UploadCloud, CalendarIcon, Plus, X, Mic, ArrowLeft, ArrowRight, File as FileIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAssignment } from "@/lib/api";
import type { QuestionType } from "@/lib/types";

type TypeRow = {
  id: QuestionType;
  count: number;
  marks: number;
};

const availableTypes = [
  { id: "mcq", label: "Multiple Choice Questions" },
  { id: "short", label: "Short Questions" },
  { id: "long", label: "Long Questions" },
  { id: "case", label: "Diagram/Graph-Based Questions" },
  { id: "numerical", label: "Numerical Problems" },
];

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export default function CreateAssignment() {
  const router = useRouter();
  const { form, setField, toFormData } = useAssignmentStore();
  
  // Local state for question types structure to match UI
  const [types, setTypes] = useState<TypeRow[]>([
    { id: "mcq", count: 4, marks: 1 },
    { id: "short", count: 3, marks: 2 },
    { id: "long", count: 2, marks: 5 },
    { id: "case", count: 5, marks: 5 },
    { id: "numerical", count: 5, marks: 5 },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState("");

  const updateType = (index: number, field: keyof TypeRow, value: TypeRow[keyof TypeRow]) => {
    const next = [...types];
    next[index] = { ...next[index], [field]: value };
    setTypes(next);
  };

  const removeType = (index: number) => {
    setTypes(types.filter((_, i) => i !== index));
  };

  const addType = () => {
    setTypes([...types, { id: "mcq", count: 1, marks: 1 }]);
  };

  const totalQuestions = types.reduce((acc, t) => acc + t.count, 0);
  const totalMarks = types.reduce((acc, t) => acc + (t.count * t.marks), 0);

  const handleNext = async () => {
    if (isGenerating) return;
    if (form.file && form.file.size > MAX_UPLOAD_BYTES) {
      setFormError("Please upload a file smaller than 50 MB.");
      return;
    }
    setFormError("");
    setField("questionCount", totalQuestions);
    setField("marksPerQuestion", Math.round(totalMarks / totalQuestions) || 1);
    setField("questionTypes", types.map((t) => ({ type: t.id, count: t.count, marks: t.marks })));

    setIsGenerating(true);
    try {
      const data = toFormData();
      const { assignment } = await createAssignment(data);
      window.dispatchEvent(new Event("assignments:changed"));
      router.push(`/assignments/${assignment._id}`);
    } catch (err: unknown) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Failed to generate assignment");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setField("file", null);
      setFormError("");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setField("file", null);
      setFormError("Please upload a file smaller than 50 MB.");
      return;
    }
    setField("file", file);
    setFormError("");
  };

  return (
    <div className="mx-auto max-w-4xl pb-28 sm:pb-24">
      <div className="md:hidden">
        <div className="-mx-4 -mt-5 bg-[#d3d3d3] px-4 pb-5 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/55 text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              aria-label="Go back"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-2xl font-bold text-gray-800">Create Assignment</h1>
            <div className="h-14 w-14" aria-hidden="true" />
          </div>

          <div className="mt-8 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-gray-600" />
            <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>

      <div className="mb-6 hidden w-full md:flex md:flex-col">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-900">Create Assignment</h1>
            <p className="text-sm text-gray-500">Set up a new assignment for your students</p>
          </div>
        </div>

        <div className="mt-8 flex w-full items-center gap-2">
          <div className="h-1.5 flex-[0.48] rounded-full bg-gray-600"></div>
          <div className="h-1.5 flex-[0.52] rounded-full bg-gray-200"></div>
        </div>
      </div>

      <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="mb-1 text-lg font-bold text-gray-900">Assignment Details</h2>
        <p className="mb-6 text-xs text-gray-500">Basic information about your assignment</p>

        {form.file ? (
          <div className="mb-6 flex flex-col gap-4 rounded-[18px] border-2 border-solid border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3 overflow-hidden pr-4">
              <div className="flex-shrink-0 rounded-lg bg-orange-100 p-2">
                <FileIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{form.file.name}</p>
                <p className="text-xs text-gray-500">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setField("file", null)} className="self-end rounded-full p-2 text-gray-500 hover:bg-gray-100 sm:self-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-gray-200 p-5 text-center sm:p-8">
            <UploadCloud className="w-6 h-6 text-gray-800 mb-3" />
            <p className="text-sm font-semibold text-gray-900 mb-1">Choose a file or drag & drop it here</p>
            <p className="text-xs text-gray-500 mb-4">JPEG, PNG, PDF up to 50MB</p>
            <label className="cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200">
              Browse Files
              <input 
                type="file" 
                className="sr-only" 
                accept=".pdf,.png,.jpeg,.jpg"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-[10px] text-gray-400 mt-4">Upload images of your preferred document/image</p>
          </div>
        )}

        {formError ? <p className="mb-5 text-sm text-red-600">{formError}</p> : null}

        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-900 mb-2">Due Date</label>
          <div className="relative">
            <input 
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 px-4 text-sm text-gray-500 outline-none focus:border-gray-300"
            />
            <CalendarIcon className="absolute right-4 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-6">
          <div className="md:hidden">
            <h3 className="mb-3 text-sm font-bold text-gray-900">Question Type</h3>

            <div className="space-y-4">
              {types.map((type, index) => (
                <div key={index} className="rounded-[24px] bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="relative min-w-0 flex-1">
                      <select
                        value={type.id}
                        onChange={(e) => updateType(index, "id", e.target.value as QuestionType)}
                        className="w-full appearance-none bg-transparent pr-8 text-base text-gray-900 outline-none"
                      >
                        {availableTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    <button
                      onClick={() => removeType(index)}
                      className="shrink-0 text-gray-700 transition-colors hover:text-gray-900"
                      aria-label="Remove question type"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="rounded-[22px] bg-[#f4f4f4] px-4 py-4">
                    <div className="mb-3 grid grid-cols-2 gap-4 px-2 text-sm font-medium text-gray-700">
                      <div className="text-left">No. of Questions</div>
                      <div className="text-left">Marks</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm">
                        <button onClick={() => updateType(index, "count", Math.max(1, type.count - 1))} className="text-2xl leading-none text-gray-500 hover:text-gray-700">−</button>
                        <span className="text-base font-medium text-gray-800">{type.count}</span>
                        <button onClick={() => updateType(index, "count", type.count + 1)} className="text-2xl leading-none text-gray-500 hover:text-gray-700">+</button>
                      </div>

                      <div className="flex items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm">
                        <button onClick={() => updateType(index, "marks", Math.max(1, type.marks - 1))} className="text-2xl leading-none text-gray-500 hover:text-gray-700">−</button>
                        <span className="text-base font-medium text-gray-800">{type.marks}</span>
                        <button onClick={() => updateType(index, "marks", type.marks + 1)} className="text-2xl leading-none text-gray-500 hover:text-gray-700">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addType} className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-gray-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white"><Plus className="h-4 w-4" /></div>
              Add Question Type
            </button>

            <div className="mt-6 flex flex-col items-end gap-1 pr-1 text-right">
              <div className="text-sm font-semibold text-gray-900">Total Questions : {totalQuestions}</div>
              <div className="text-sm font-semibold text-gray-900">Total Marks : {totalMarks}</div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="mb-3 grid grid-cols-[1fr_20px_100px_100px] gap-4 px-1 text-xs font-bold text-gray-900">
              <div>Question Type</div>
              <div></div>
              <div className="text-center">No. of Questions</div>
              <div className="text-center">Marks</div>
            </div>

            <div className="space-y-4">
              {types.map((type, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[1fr_20px_100px_100px] md:items-center md:gap-4">
                  <div className="relative">
                    <select 
                      value={type.id}
                      onChange={(e) => updateType(index, "id", e.target.value as QuestionType)}
                      className="w-full appearance-none rounded-xl border border-gray-100 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-gray-700 shadow-sm outline-none focus:border-gray-300"
                    >
                      {availableTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <button onClick={() => removeType(index)} className="flex justify-center text-gray-400 hover:text-gray-600 md:justify-center">
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <button onClick={() => updateType(index, "count", Math.max(1, type.count - 1))} className="text-gray-400 hover:text-gray-600">−</button>
                    <span className="text-sm font-bold text-gray-700">{type.count}</span>
                    <button onClick={() => updateType(index, "count", type.count + 1)} className="text-gray-400 hover:text-gray-600">+</button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <button onClick={() => updateType(index, "marks", Math.max(1, type.marks - 1))} className="text-gray-400 hover:text-gray-600">−</button>
                    <span className="text-sm font-bold text-gray-700">{type.marks}</span>
                    <button onClick={() => updateType(index, "marks", type.marks + 1)} className="text-gray-400 hover:text-gray-600">+</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addType} className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-900 hover:text-gray-700">
              <div className="bg-gray-900 text-white p-1 rounded-full"><Plus className="w-3 h-3" /></div>
              Add Question Type
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-900 mb-2">Additional Information (For better output)</label>
          <div className="relative">
            <textarea 
              placeholder="e.g Generate a question paper for 3 hour exam duration.."
              value={form.instructions}
              onChange={(e) => setField("instructions", e.target.value)}
              className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-4 text-sm text-gray-600 outline-none focus:border-gray-300 min-h-[100px] resize-none border-dashed"
            />
            <button className="absolute right-4 bottom-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200">
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 flex items-center justify-between border-t border-gray-100 bg-white/90 px-4 py-4 backdrop-blur-sm sm:px-6 md:bottom-0 md:left-64 md:right-0 md:px-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        
        <button 
          onClick={handleNext}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-black disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Next"}
          {!isGenerating && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
