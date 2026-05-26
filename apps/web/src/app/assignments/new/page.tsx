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

export default function CreateAssignment() {
  const router = useRouter();
  const { form, setField, toggleType, toFormData } = useAssignmentStore();
  
  // Local state for question types structure to match UI
  const [types, setTypes] = useState<TypeRow[]>([
    { id: "mcq", count: 4, marks: 1 },
    { id: "short", count: 3, marks: 2 },
    { id: "long", count: 2, marks: 5 },
    { id: "case", count: 5, marks: 5 },
    { id: "numerical", count: 5, marks: 5 },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

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
    setField("questionCount", totalQuestions);
    setField("marksPerQuestion", Math.round(totalMarks / totalQuestions) || 1);
    setField("questionTypes", types.map((t) => ({ type: t.id, count: t.count, marks: t.marks })));

    setIsGenerating(true);
    try {
      const data = toFormData();
      const { assignment } = await createAssignment(data);
      router.push(`/assignments/${assignment._id}`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to generate assignment");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Create Assignment</h1>
          <p className="text-gray-500 text-xs">Set up a new assignment for your students</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-10 w-full max-w-sm">
        <div className="h-1.5 flex-1 bg-gray-600 rounded-full"></div>
        <div className="h-1.5 flex-1 bg-gray-200 rounded-full"></div>
      </div>

      <div className="bg-white rounded-[24px] p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Assignment Details</h2>
        <p className="text-gray-500 text-xs mb-6">Basic information about your assignment</p>

        {form.file ? (
          <div className="border-2 border-solid border-gray-200 rounded-xl p-6 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden pr-4">
              <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
                <FileIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 truncate">{form.file.name}</p>
                <p className="text-xs text-gray-500">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setField("file", null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 mb-6 flex flex-col items-center justify-center text-center">
            <UploadCloud className="w-6 h-6 text-gray-800 mb-3" />
            <p className="text-sm font-semibold text-gray-900 mb-1">Choose a file or drag & drop it here</p>
            <p className="text-xs text-gray-500 mb-4">JPEG, PNG, PDF upto 10MB</p>
            <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-colors">
              Browse Files
              <input 
                type="file" 
                className="sr-only" 
                accept=".pdf,.png,.jpeg,.jpg"
                onChange={(e) => setField("file", e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-[10px] text-gray-400 mt-4">Upload images of your preferred document/image</p>
          </div>
        )}

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
          <div className="grid grid-cols-[1fr_20px_100px_100px] gap-4 mb-3 px-1 text-xs font-bold text-gray-900">
            <div>Question Type</div>
            <div></div>
            <div className="text-center">No. of Questions</div>
            <div className="text-center">Marks</div>
          </div>
          
          <div className="space-y-4">
            {types.map((type, index) => (
              <div key={index} className="grid grid-cols-[1fr_20px_100px_100px] gap-4 items-center">
                <div className="relative">
                  <select 
                    value={type.id}
                    onChange={(e) => updateType(index, "id", e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-100 shadow-sm rounded-xl py-2.5 pl-4 pr-10 text-sm text-gray-700 font-medium outline-none focus:border-gray-300"
                  >
                    {availableTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <svg className="absolute right-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                <button onClick={() => removeType(index)} className="text-gray-400 hover:text-gray-600 flex justify-center">
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2">
                  <button onClick={() => updateType(index, "count", Math.max(1, type.count - 1))} className="text-gray-400 hover:text-gray-600">−</button>
                  <span className="text-sm font-bold text-gray-700">{type.count}</span>
                  <button onClick={() => updateType(index, "count", type.count + 1)} className="text-gray-400 hover:text-gray-600">+</button>
                </div>
                
                <div className="flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-xl px-3 py-2">
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

        <div className="flex flex-col items-end gap-1 mb-8 pr-1">
          <div className="text-sm font-semibold text-gray-900">Total Questions : {totalQuestions}</div>
          <div className="text-sm font-semibold text-gray-900">Total Marks : {totalMarks}</div>
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
            <button className="absolute right-4 bottom-4 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-64 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 px-8 py-4 flex items-center justify-between z-30">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-5 py-2.5 rounded-full font-semibold text-sm shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        
        <button 
          onClick={handleNext}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-[#1a1a1a] text-white hover:bg-black px-6 py-2.5 rounded-full font-semibold text-sm shadow-md transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Next"}
          {!isGenerating && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
