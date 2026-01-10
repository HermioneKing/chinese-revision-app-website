'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const BarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false }
);
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface QuestionRecord {
  record_id: number;
  questions_id: number;
  student_id: number;
  answer: string;
  is_correct: boolean;
  tested_date: string;
}

export default function Home() {
  const [questionRecords, setQuestionRecords] = useState<QuestionRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    fetch('http://localhost:5001/api/question_records')
      .then((res) => res.json())
      .then((data) => setQuestionRecords(data))
      .catch((error) => console.error('Failed to fetch question records:', error));
  }, []);

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = questionRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const chartData = [
    {
      name: 'Correct vs. Incorrect',
      correct: questionRecords.filter((r) => r.is_correct).length,
      incorrect: questionRecords.filter((r) => !r.is_correct).length,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center gap-8 py-16 px-8 bg-white dark:bg-black sm:items-start">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Question Records
        </h1>

        <div className="w-full">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Records Table
          </h2>
          <table className="mt-4 w-full text-left">
            <thead>
              <tr>
                <th className="py-2">Record ID</th>
                <th className="py-2">Question ID</th>
                <th className="py-2">Student ID</th>
                <th className="py-2">Correct</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((record) => (
                <tr key={record.record_id}>
                  <td className="py-2">{record.record_id}</td>
                  <td className="py-2">{record.questions_id}</td>
                  <td className="py-2">{record.student_id}</td>
                  <td className="py-2">{record.is_correct ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-center">
            {Array.from({ length: Math.ceil(questionRecords.length / recordsPerPage) }, (_, i) => (
              <button
                key={i}
                onClick={() => paginate(i + 1)}
                className={`mx-1 px-3 py-1 ${
                  currentPage === i + 1 ? 'bg-zinc-900 text-white' : 'bg-zinc-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Correct vs. Incorrect Answers
          </h2>
          <div className="mt-4">
            <BarChart
              width={500}
              height={300}
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="correct" fill="#82ca9d" />
              <Bar dataKey="incorrect" fill="#8884d8" />
            </BarChart>
          </div>
        </div>
      </main>
    </div>
  );
}
