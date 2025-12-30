import React from 'react';
import { Task, TaskStatus } from '../../types';
import { TaskCardV4 } from './TaskCardV4';

interface ColumnV4Props {
    title: string;
    status: TaskStatus;
    tasks: Task[];
    count: number;
    accentColor: string;
    bgColor: string;
    onDrop: (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => void;
    onTaskClick: (task: Task) => void;
    onAddClick?: () => void;
    onFocusTask?: (task: Task) => void;
    onMoveTask?: (task: Task, direction: 'prev' | 'next') => void;
    wipLimit?: number;
    activeCount?: number;
    isDropDisabled?: boolean;
}

export const ColumnV4: React.FC<ColumnV4Props> = ({
    title,
    status,
    tasks,
    count,
    accentColor,
    bgColor,
    onDrop,
    onTaskClick,
    onAddClick,
    onFocusTask,
    onMoveTask,
    wipLimit,
    activeCount,
    isDropDisabled
}) => {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDropDisabled) {
            e.preventDefault();
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDropDisabled) {
            onDrop(e, status);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Column Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-[#1A2B3C] flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${accentColor}`}></div>
                        {title}
                    </h3>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${accentColor} bg-opacity-10 border border-current border-opacity-20`}>
                        <span className={`text-sm font-bold ${accentColor.replace('bg-', 'text-')}`}>
                            {count}
                        </span>
                        {wipLimit && (
                            <span className="text-xs text-[#1A2B3C]/60">/ {wipLimit}</span>
                        )}
                    </div>
                </div>

                {/* WIP Warning */}
                {wipLimit && activeCount !== undefined && activeCount >= wipLimit && (
                    <div className="text-xs text-[#FF4D4D] bg-[#FF4D4D]/10 px-3 py-2 rounded-lg border border-[#FF4D4D]/30 font-medium">
                        ⚠️ Límite WIP alcanzado
                    </div>
                )}
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex-1 rounded-2xl p-4 ${bgColor} border-2 border-dashed transition-all duration-200 ${isDropDisabled
                    ? 'border-[#E2E8F0]'
                    : 'border-[#E2E8F0] hover:border-[#38D1B4]/40'
                    }`}
            >
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <TaskCardV4
                            key={task.id}
                            task={task}
                            onClick={() => onTaskClick(task)}
                            onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                            onFocus={onFocusTask ? () => onFocusTask(task) : undefined}
                            onMove={onMoveTask ? (dir) => onMoveTask(task, dir) : undefined}
                        />
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center py-12 text-[#1A2B3C]/30">
                            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p className="text-sm font-medium">Sin tareas aquí</p>
                        </div>
                    )}

                    {/* Add Button */}
                    {status === TaskStatus.TODO && onAddClick && (
                        <button
                            onClick={onAddClick}
                            className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#38D1B4]/40 hover:border-[#38D1B4] text-[#38D1B4] hover:text-[#2BA891] text-sm font-semibold transition-all duration-200 hover:bg-white"
                        >
                            + Añadir desde Vaciado
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
