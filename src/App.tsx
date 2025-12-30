
import React, { useState, useEffect, useMemo } from 'react';
import { Logo } from './components/Logo';
import { AppState, Task, TaskStatus, UserState, MOOD_LABELS, AppView, BoardContext, TaskPriority, SystemSettings, EnergyLevel, Mood } from './types';
import { loadState, saveState, DEFAULT_SETTINGS } from './services/storageService';
import { calculateWipLimit, getSystemAdvice, getNextOptimalTask } from './services/adaptiveLogic';
import { JournalingModule } from './components/JournalingModule';
import { Column } from './components/Column';
import { ColumnV2 } from './components/kanban/ColumnV2';
import { ColumnV3 } from './components/kanban/ColumnV3'; // Warm palette
import { ColumnV4 } from './components/kanban/ColumnV4'; // FlowState palette
import { Button } from './components/Button';
import { BrainDump } from './components/BrainDump';
import { BrainDumpV2 } from './components/BrainDumpV2';
import { TaskModal } from './components/TaskModal';
import { BacklogModal } from './components/BacklogModal';
import { Dashboard } from './components/Dashboard';
import { DashboardV2 } from './components/DashboardV2';
import { DashboardV3 } from './components/DashboardV3'; // NEW: Warm color palette
import { DashboardV4 } from './components/DashboardV4'; // FlowState palette
import { WeeklyReview } from './components/WeeklyReview';
import { SettingsModal } from './components/SettingsModal';
import { FocusMode } from './components/FocusMode';
import { DurationPrompt } from './components/DurationPrompt';
import { ShutdownScreen } from './components/ShutdownScreen';
import { DecisionBridgeModal } from './components/DecisionBridgeModal';
import { triggerConfetti } from './services/confetti';
import { playSuccessSound } from './services/soundService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<UserState[]>([]);
  const [wipLimit, setWipLimit] = useState<number>(2);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [dailyIntention, setDailyIntention] = useState<string>("");

  const [showJournal, setShowJournal] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isEnergyFilterActive, setIsEnergyFilterActive] = useState<boolean>(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [previousView, setPreviousView] = useState<AppView>(AppView.BOARD);
  const [boardContext, setBoardContext] = useState<BoardContext>(BoardContext.TOGETHER);

  // Task Editing & Modals
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [showBacklogModal, setShowBacklogModal] = useState<boolean>(false);
  const [taskPendingDuration, setTaskPendingDuration] = useState<Task | null>(null);

  // Decision Bridge State
  const [showDecisionBridge, setShowDecisionBridge] = useState(false);
  const [suggestedTask, setSuggestedTask] = useState<Task | null>(null);

  // Initialization & Onboarding
  useEffect(() => {
    const loaded = loadState();

    // ONBOARDING LOGIC
    if (loaded.tasks.length === 0 && !loaded.userState) {
      const demoTasks: Task[] = [
        {
          id: crypto.randomUUID(),
          content: "👋 ¡Bienvenido! Tócame o Arrástrame a 'En Curso'",
          description: "Este es un sistema Kanban. El objetivo es mover tareas de izquierda a derecha. Intenta moverme a la columna del medio.",
          status: TaskStatus.TODO,
          category: "Tutorial",
          priority: TaskPriority.HIGH,
          requiredEnergy: EnergyLevel.MEDIUM,
          createdAt: Date.now(),
          estimatedDuration: 5
        },
        {
          id: crypto.randomUUID(),
          content: "⚡ Esta tarea requiere Energía Alta (Icono Cerebro)",
          description: "GlowUp te avisará si intentas hacer esto cuando estás cansado. Es una característica de protección cognitiva.",
          status: TaskStatus.TODO,
          category: "Tutorial",
          priority: TaskPriority.MEDIUM,
          requiredEnergy: EnergyLevel.HIGH,
          createdAt: Date.now() - 1000,
          estimatedDuration: 45
        },
        {
          id: crypto.randomUUID(),
          content: "🛑 Intenta llenar la columna 'En Curso'",
          description: "El sistema tiene un límite de WIP (Work In Progress). Si intentas meter más de 2 tareas en la columna central, te bloquearé. ¡Es por tu bien!",
          status: TaskStatus.TODO,
          category: "Tutorial",
          priority: TaskPriority.LOW,
          requiredEnergy: EnergyLevel.LOW,
          createdAt: Date.now() - 2000,
          estimatedDuration: 15
        }
      ];
      setTasks(demoTasks);
    } else {
      const migratedTasks = loaded.tasks.map(t => ({
        ...t,
        status: t.status === 'TODO' as any && !t.category ? TaskStatus.BRAIN_DUMP : t.status,
        category: t.category || "Otros",
        priority: t.priority || TaskPriority.MEDIUM,
        subtasks: t.subtasks || []
      }));
      setTasks(migratedTasks);
    }

    setUserState(loaded.userState);
    setCheckInHistory(loaded.checkInHistory || []);
    setWipLimit(loaded.wipLimit);
    if (loaded.settings) setSettings(loaded.settings);
    if (loaded.dailyIntention) setDailyIntention(loaded.dailyIntention);

    if (!loaded.userState) {
      setShowJournal(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    saveState({ tasks, userState, checkInHistory, wipLimit, settings, dailyIntention });
  }, [tasks, userState, checkInHistory, wipLimit, settings, dailyIntention]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setShowSettings(false);
        setEditingTask(null);
        setShowBacklogModal(false);
        setTaskPendingDuration(null);
        setShowDecisionBridge(false);
      }
      if (e.shiftKey && e.key === 'D') setCurrentView(AppView.DASHBOARD);
      if (e.shiftKey && e.key === 'B') setCurrentView(AppView.BOARD);
      if (e.shiftKey && e.key === 'V') setCurrentView(AppView.BRAIN_DUMP);
      if (e.shiftKey && e.key === 'N') {
        if (currentView === AppView.BOARD) setShowBacklogModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleCheckIn = (newState: UserState) => {
    const newLimit = calculateWipLimit(newState.mood, newState.energy, settings);
    setUserState(newState);
    setCheckInHistory(prev => [...prev, newState]);
    setWipLimit(newLimit);
    setShowJournal(false);
  };

  const handleSettingsUpdate = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if (userState) {
      const newLimit = calculateWipLimit(userState.mood, userState.energy, newSettings);
      setWipLimit(newLimit);
    }
  };

  const handleBrainDumpProcess = (lines: string[]) => {
    const newTasks: Task[] = lines.map(content => ({
      id: crypto.randomUUID(),
      content: content.trim(),
      status: TaskStatus.BRAIN_DUMP,
      category: "Otros",
      priority: TaskPriority.MEDIUM,
      requiredEnergy: EnergyLevel.MEDIUM,
      createdAt: Date.now(),
      subtasks: []
    }));
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleImportTasks = (partialTasks: Partial<Task>[]) => {
    const newTasks: Task[] = partialTasks.map(pt => ({
      id: crypto.randomUUID(),
      content: pt.content || "Tarea sin título",
      status: TaskStatus.BRAIN_DUMP,
      category: pt.category || "Otros",
      priority: pt.priority || TaskPriority.MEDIUM,
      requiredEnergy: pt.requiredEnergy || EnergyLevel.MEDIUM,
      estimatedDuration: pt.estimatedDuration,
      createdAt: Date.now(),
      subtasks: []
    }));
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("¿Estás seguro de querer eliminar esta tarea?")) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleSubtaskToggle = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSubtasks = t.subtasks?.map(s =>
        s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      return { ...t, subtasks: newSubtasks };
    }));
    playSuccessSound();
  };

  const handleAddToBoard = (task: Task) => {
    let targetContext = boardContext;
    if (targetContext === BoardContext.TOGETHER) {
      targetContext = BoardContext.PERSONAL;
    }
    const updatedTask = {
      ...task,
      status: TaskStatus.TODO,
      boardContext: targetContext
    };
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    setShowBacklogModal(false);
  };

  // Logic to trigger the Decision Bridge
  const triggerDecisionBridge = (updatedTasks: Task[]) => {
    if (!userState) return;
    // Find the next best task
    const nextTask = getNextOptimalTask(updatedTasks, userState.energy);
    setSuggestedTask(nextTask);
    // Small delay for confetti to pop first
    setTimeout(() => {
      setShowDecisionBridge(true);
    }, 1000);
  };

  const validateAndMoveTask = (task: Task, targetStatus: TaskStatus) => {
    if (task.status === targetStatus) return;

    // WIP Check
    if (targetStatus === TaskStatus.IN_PROGRESS) {
      const activeInProgressCount = tasks.filter(t =>
        t.status === TaskStatus.IN_PROGRESS && !t.isBlocked
      ).length;

      if (activeInProgressCount >= wipLimit) {
        alert("🛑 Límite de WIP alcanzado.\n\nEl sistema protege tu cerebro impidiendo que abras más ciclos. Termina algo antes de empezar algo nuevo.");
        return;
      }

      if (userState && userState.energy === EnergyLevel.LOW && task.requiredEnergy === EnergyLevel.HIGH) {
        const proceed = confirm(
          "⚠️ Alerta de Energía\n\nTu nivel de energía actual es BAJO, pero esta tarea requiere concentración ALTA.\n\n¿Deseas continuar de todos modos?"
        );
        if (!proceed) return;
      }
    }

    const updatedTask = { ...task, status: targetStatus };

    if (targetStatus === TaskStatus.IN_PROGRESS && !task.startedAt) {
      updatedTask.startedAt = Date.now();
      if (userState) {
        updatedTask.startContext = {
          mood: userState.mood,
          energy: userState.energy
        };
      }
    }

    if (targetStatus === TaskStatus.DONE) {
      updatedTask.completedAt = Date.now();
    }

    // Optimistic update
    const newTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    setTasks(newTasks);

    // Trigger Effects AFTER state update logic
    if (targetStatus === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      triggerConfetti();
      playSuccessSound();
      // Trigger Bridge logic with the NEW tasks array
      triggerDecisionBridge(newTasks);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    validateAndMoveTask(task, targetStatus);
  };

  const handleManualMove = (task: Task, targetStatus: TaskStatus) => {
    validateAndMoveTask(task, targetStatus);
  };

  const handleEnterFocus = (task: Task) => {
    if (!task.estimatedDuration || task.estimatedDuration <= 0) {
      setTaskPendingDuration(task);
      return;
    }
    startFocusSession(task);
  };

  const handleDurationConfirmed = (minutes: number) => {
    if (!taskPendingDuration) return;
    const updatedTask = { ...taskPendingDuration, estimatedDuration: minutes };
    handleTaskUpdate(updatedTask);
    setTaskPendingDuration(null);
    startFocusSession(updatedTask);
  };

  const startFocusSession = (task: Task) => {
    setActiveFocusTask(task);
    setPreviousView(currentView);
    setCurrentView(AppView.FOCUS);
    setShowDecisionBridge(false); // Ensure modal is closed when entering focus
  };

  const handleExitFocus = () => {
    setActiveFocusTask(null);
    setCurrentView(previousView);
  };

  const handleCompleteFromFocus = (task: Task) => {
    const updatedTask = {
      ...task,
      status: TaskStatus.DONE,
      completedAt: Date.now()
    };

    // Update State
    const newTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    setTasks(newTasks);

    // UI Effects
    triggerConfetti();
    playSuccessSound();

    // Exit Focus Mode first
    handleExitFocus();

    // Trigger Bridge
    triggerDecisionBridge(newTasks);
  };

  // Bridge Actions
  const handleBridgeStartTask = (task: Task) => {
    // Move task to In Progress automatically
    const updatedTask = { ...task, status: TaskStatus.IN_PROGRESS, startedAt: Date.now() };
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    setShowDecisionBridge(false);

    // Start Focus Mode immediately
    handleEnterFocus(updatedTask);
  };

  const handleBridgeClose = () => {
    setShowDecisionBridge(false);
  };

  const handleCaptureThought = (thought: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      content: thought,
      status: TaskStatus.BRAIN_DUMP,
      category: 'Distracción',
      priority: TaskPriority.LOW,
      createdAt: Date.now(),
      subtasks: [],
      requiredEnergy: EnergyLevel.LOW
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleInitiateShutdown = () => {
    setCurrentView(AppView.SHUTDOWN);
  };

  const handleShutdownMoveWip = () => {
    setTasks(prev => prev.map(t => {
      if (t.status === TaskStatus.IN_PROGRESS && !t.isBlocked) {
        return { ...t, status: TaskStatus.TODO };
      }
      return t;
    }));
  };

  const handleShutdownWakeUp = () => {
    setDailyIntention("");
    setCurrentView(AppView.DASHBOARD);
  };

  const getAmbientBackground = () => {
    if (!userState) return 'bg-slate-50';
    switch (userState.mood) {
      case Mood.ANXIOUS: return 'bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50';
      case Mood.STRESSED: return 'bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-white';
      case Mood.TIRED: return 'bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-slate-50';
      case Mood.FOCUSED: return 'bg-white';
      case Mood.CALM: return 'bg-gradient-to-br from-glow-50 via-white to-glow-100/50';
      default: return 'bg-slate-50';
    }
  };

  // SMART SORT LOGIC
  const smartSortTasks = (tasksToSort: Task[]) => {
    if (!userState) return tasksToSort;

    return [...tasksToSort].sort((a, b) => {
      if (a.priority === TaskPriority.URGENT && b.priority !== TaskPriority.URGENT) return -1;
      if (b.priority === TaskPriority.URGENT && a.priority !== TaskPriority.URGENT) return 1;

      const aMatchesEnergy = a.requiredEnergy === userState.energy;
      const bMatchesEnergy = b.requiredEnergy === userState.energy;

      if (aMatchesEnergy && !bMatchesEnergy) return -1;
      if (!aMatchesEnergy && bMatchesEnergy) return 1;

      const pOrder = { [TaskPriority.HIGH]: 0, [TaskPriority.MEDIUM]: 1, [TaskPriority.LOW]: 2, [TaskPriority.URGENT]: -1 };
      const diff = pOrder[a.priority] - pOrder[b.priority];
      if (diff !== 0) return diff;

      return a.createdAt - b.createdAt;
    });
  };

  const getFilteredTasks = (status: TaskStatus) => {
    const statusFiltered = tasks.filter(t => t.status === status);

    const contextFiltered = statusFiltered.filter(t => {
      if (boardContext === BoardContext.TOGETHER) return true;
      if (boardContext === BoardContext.WORK) return t.boardContext === BoardContext.WORK;
      if (boardContext === BoardContext.PERSONAL) return t.boardContext === BoardContext.PERSONAL;
      return true;
    });

    if (status === TaskStatus.TODO) {
      return smartSortTasks(contextFiltered);
    }

    if (status === TaskStatus.DONE) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return contextFiltered.filter(t => t.completedAt && t.completedAt >= todayStart.getTime());
    }

    return contextFiltered;
  };

  const todoTasks = getFilteredTasks(TaskStatus.TODO);
  const inProgressTasks = getFilteredTasks(TaskStatus.IN_PROGRESS);
  const doneTasks = getFilteredTasks(TaskStatus.DONE);

  const globalActiveWip = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS && !t.isBlocked).length;

  const handleArrowMove = (task: Task, direction: 'prev' | 'next') => {
    let targetStatus: TaskStatus | null = null;
    
    if (direction === 'next') {
      if (task.status === TaskStatus.TODO) targetStatus = TaskStatus.IN_PROGRESS;
      else if (task.status === TaskStatus.IN_PROGRESS) targetStatus = TaskStatus.DONE;
    } else {
      if (task.status === TaskStatus.IN_PROGRESS) targetStatus = TaskStatus.TODO;
      else if (task.status === TaskStatus.DONE) targetStatus = TaskStatus.IN_PROGRESS;
    }

    if (targetStatus) {
      validateAndMoveTask(task, targetStatus);
    }
  };

  if (currentView === AppView.FOCUS && activeFocusTask) {
    return (
      <FocusMode
        task={activeFocusTask}
        onComplete={handleCompleteFromFocus}
        onExit={handleExitFocus}
        onCaptureThought={handleCaptureThought}
      />
    );
  }

  if (currentView === AppView.SHUTDOWN) {
    return (
      <ShutdownScreen
        tasks={tasks}
        onMoveWipToTodo={handleShutdownMoveWip}
        onShutdownComplete={() => { }}
        onWakeUp={handleShutdownWakeUp}
      />
    );
  }

  const brainDumpProps = {
    tasks: tasks,
    onProcessTasks: handleBrainDumpProcess,
    onUpdateTask: handleTaskUpdate,
    onDeleteTask: handleDeleteTask,
    onImportTasks: handleImportTasks
  } as any;

  return (
    <div className={`min-h-screen text-slate-900 flex flex-col transition-colors duration-1000 ${getAmbientBackground()}`}>
      {/* Decision Bridge Modal */}
      <DecisionBridgeModal
        isOpen={showDecisionBridge}
        suggestedTask={suggestedTask}
        userEnergy={userState?.energy || EnergyLevel.MEDIUM}
        onStartTask={handleBridgeStartTask}
        onTakeBreak={handleBridgeClose}
      />

      {/* Modals */}
      {showJournal && (
        <JournalingModule
          onCheckIn={handleCheckIn}
          isInitial={!userState}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={true}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={handleSettingsUpdate}
        />
      )}

      {editingTask && (
        <TaskModal
          task={editingTask}
          isOpen={true}
          onClose={() => setEditingTask(null)}
          onSave={handleTaskUpdate}
        />
      )}

      {showBacklogModal && (
        <BacklogModal
          tasks={tasks.filter(t => t.status === TaskStatus.BRAIN_DUMP)}
          isOpen={true}
          onClose={() => setShowBacklogModal(false)}
          onAddToBoard={handleAddToBoard}
          context={boardContext}
        />
      )}

      {taskPendingDuration && (
        <DurationPrompt
          isOpen={true}
          taskTitle={taskPendingDuration.content}
          onConfirm={handleDurationConfirmed}
          onCancel={() => setTaskPendingDuration(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-glow-100 sticky top-0 z-10 transition-colors duration-500 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="w-9 h-9" />
            <h1 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-glow-600 to-indigo-600 hidden sm:block font-sans">
              GlowUp
            </h1>

            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-glow-500 text-white px-3 py-1 rounded-full shadow-lg shadow-glow-200 animate-pulse hover:bg-glow-600 transition-all"
              >
                Instalar App
              </button>
            )}
          </div>

          <nav className="flex items-center space-x-1 bg-slate-100/50 p-1 rounded-lg overflow-x-auto">
            {[
              { id: AppView.DASHBOARD, label: 'Resumen' },
              { id: AppView.BRAIN_DUMP, label: 'Vaciado' },
              { id: AppView.BOARD, label: 'Tablero' },
              { id: AppView.REFLECTION, label: 'Reflexión' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${currentView === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {userState && (
              <div className="hidden md:flex items-center gap-3 text-sm">
                <span className="text-slate-500">
                  <span className="font-medium text-slate-700">{MOOD_LABELS[userState.mood]}</span>
                </span>
                <span className="w-px h-4 bg-slate-200"></span>
                <span className="text-slate-500">
                  WIP: <span className="font-medium text-slate-700">{globalActiveWip}/{wipLimit}</span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowJournal(true)}
              >
                Check In
              </Button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
              <button
                onClick={handleInitiateShutdown}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 ml-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {currentView === AppView.DASHBOARD && (
          <DashboardV4
            tasks={tasks}
            userState={userState}
            intention={dailyIntention}
            onUpdateIntention={setDailyIntention}
            onNavigateToBoard={() => setCurrentView(AppView.BOARD)}
            onOpenJournal={() => setShowJournal(true)}
          />
        )}

        {currentView === AppView.BRAIN_DUMP && (
          <BrainDump {...brainDumpProps} />
        )}

        {currentView === AppView.BOARD && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-slate-800 mb-1">
                  Modo Actual: {wipLimit <= settings.wipLimits.protective ? 'Protector' : wipLimit >= settings.wipLimits.max ? 'Alto Flujo' : 'Sostenible'}
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-slate-500 text-sm">
                    {getSystemAdvice(wipLimit, settings)}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsEnergyFilterActive(!isEnergyFilterActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${isEnergyFilterActive
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  title="Ocultar tareas que requieren más energía de la que tienes ahora"
                >
                  {isEnergyFilterActive ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                  {isEnergyFilterActive ? 'Filtro Activado' : 'Filtrar por Energía'}
                </button>

                <div className="flex space-x-2 bg-white/50 backdrop-blur-sm border border-slate-200/50 p-1 rounded-lg">
                  {[
                    { id: BoardContext.PERSONAL, label: 'Personal' },
                    { id: BoardContext.WORK, label: 'Trabajo' },
                    { id: BoardContext.TOGETHER, label: 'Juntos' },
                  ].map(ctx => (
                    <button
                      key={ctx.id}
                      onClick={() => setBoardContext(ctx.id)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${boardContext === ctx.id
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                    >
                      {ctx.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start h-full">
              <ColumnV4
                title="Pendiente"
                status={TaskStatus.TODO}
                tasks={todoTasks}
                count={todoTasks.length}
                accentColor="bg-[#1A2B3C]"
                bgColor="bg-[#F4F7F9]"
                onDrop={handleDrop}
                onTaskClick={setEditingTask}
                onAddClick={() => setShowBacklogModal(true)}
                onMoveTask={handleArrowMove}
              />
              <ColumnV4
                title="En Curso"
                status={TaskStatus.IN_PROGRESS}
                tasks={inProgressTasks}
                count={inProgressTasks.filter(t => !t.isBlocked).length}
                accentColor="bg-[#38D1B4]"
                bgColor="bg-[#F0FDFA]"
                wipLimit={wipLimit}
                activeCount={inProgressTasks.filter(t => !t.isBlocked).length}
                onDrop={handleDrop}
                onTaskClick={setEditingTask}
                onFocusTask={handleEnterFocus}
                isDropDisabled={globalActiveWip >= wipLimit}
                onMoveTask={handleArrowMove}
              />
              <ColumnV4
                title="Hecho Hoy"
                status={TaskStatus.DONE}
                tasks={doneTasks}
                count={doneTasks.length}
                accentColor="bg-[#0284C7]"
                bgColor="bg-[#BAE6FD]/20"
                onDrop={handleDrop}
                onTaskClick={setEditingTask}
                onMoveTask={handleArrowMove}
              />
            </div>
          </>
        )}

        {currentView === AppView.REFLECTION && (
          <WeeklyReview tasks={tasks} checkInHistory={checkInHistory} />
        )}

      </main>
    </div>
  );
};

export default App;
