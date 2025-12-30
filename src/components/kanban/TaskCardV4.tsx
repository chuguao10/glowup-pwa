import React from 'react';
import { colors } from '../../theme/colors';
import { Task, TaskPriority, EnergyLevel } from '../../types';

interface TaskCardV4Props {
    task: Task;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onFocus?: () => void;
    onMove?: (direction: 'prev' | 'next') => void;
}

export const TaskCardV4: React.FC<TaskCardV4Props> = ({
    task,
    onClick,
    onDragStart,
    onFocus,
    onMove
}) => {
    const getPriorityColor = () => {
        switch (task.priority) {
            case TaskPriority.URGENT: return `bg-[${colors.deepWork}]`; // Trabajo Profundo (Rojo)
            case TaskPriority.HIGH: return `bg-[${colors.superficialWork}]`; // Trabajo Superficial (Amarillo)
            case TaskPriority.MEDIUM: return `bg-[${colors.introspection}]`; // Introspección (Azul)
            case TaskPriority.LOW: return `bg-[${colors.primary}]`; // Verde Menta
            default: return `bg-[${colors.border}]`;
        }
    };

    const getEnergyIcon = () => {
        switch (task.requiredEnergy) {
            case EnergyLevel.HIGH: return '⚡';
            case EnergyLevel.MEDIUM: return '🔹';
            case EnergyLevel.LOW: return '🔋';
            default: return '';
        }
    };

    const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;
    const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
            className={`group relative bg-white rounded-xl p-4 shadow-sm hover:shadow-md border border-[${colors.border}] hover:border-[${colors.primaryHover}]/50 transition-all duration-200 cursor-pointer`}
        >
            {/* Priority Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${getPriorityColor()}`}></div>

            <div className="pl-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-[#1A2B3C] flex-1 line-clamp-2 group-hover:text-[#38D1B4] transition-colors">
                        {task.content}
                    </h4>
                    <span className="text-lg flex-shrink-0">{getEnergyIcon()}</span>
                </div>

                {/* Category & Duration */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[${colors.background}] text-[${colors.title}]/70 border border-[${colors.border}]`}>
                        {task.category}
                    </span>
                    {task.estimatedDuration && (
                        <span className={`text-xs text-[${colors.title}]/60 flex items-center gap-1`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {task.estimatedDuration}m
                        </span>
                    )}
                </div>

                {/* Progress Bar */}
                {task.status === 'IN_PROGRESS' && totalSubtasks > 0 && (
                    <div className="mb-3">
                        <div className={`flex items-center justify-between text-xs text-[${colors.title}]/60 mb-1`}>
                            <span>Progreso</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className={`w-full h-1.5 bg-[${colors.background}] rounded-full overflow-hidden`}>
                            <div
                                className={`h-full bg-gradient-to-r from-[${colors.primary}] to-[${colors.primaryHover}] rounded-full transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Subtasks */}
                {totalSubtasks > 0 && (
                    <div className="text-xs text-[#1A2B3C]/60 flex items-center gap-1 mb-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        {completedSubtasks}/{totalSubtasks} subtareas
                    </div>
                )}

                {/* Focus Button */}
                {task.status === 'IN_PROGRESS' && onFocus && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onFocus();
                        }}
                        className={`mt-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[${colors.primary}] to-[${colors.primaryHover}] hover:from-[${colors.primaryHover}] hover:to-[${colors.primary}] text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200`}
                    >
                        🎯 Entrar en Foco
                    </button>
                )}

                {/* Mobile/Touch Actions - Explicit Arrows */}
                {onMove && (
                    <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2 md:hidden">
                        {(task.status === 'IN_PROGRESS' || task.status === 'DONE') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMove('prev'); }}
                                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300"
                                aria-label="Mover a anterior"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                            </button>
                        )}
                        {(task.status === 'TODO' || task.status === 'IN_PROGRESS') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onMove('next'); }}
                                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300"
                                aria-label="Mover a siguiente"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
