/**
 * Goal Management Hook
 * Handles creating, updating, and tracking rider goals
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../types/analytics';

const GOALS_STORAGE_KEY = '@gasfill_rider_goals';

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Load goals from storage
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const stored = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        const parsedGoals = JSON.parse(stored);
        setGoals(parsedGoals);
      }
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGoals = async (updatedGoals: Goal[]) => {
    try {
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));
      setGoals(updatedGoals);
    } catch (error) {
      console.error('Failed to save goals:', error);
    }
  };

  const addGoal = async (goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
    };
    
    const updatedGoals = [...goals, newGoal];
    await saveGoals(updatedGoals);
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    const updatedGoals = goals.map(goal =>
      goal.id === goalId ? { ...goal, ...updates } : goal
    );
    await saveGoals(updatedGoals);
  };

  const deleteGoal = async (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    await saveGoals(updatedGoals);
  };

  const updateGoalProgress = async (goalId: string, current: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const achieved = current >= goal.target;
    await updateGoal(goalId, { current, achieved });
  };

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    refreshGoals: loadGoals,
  };
};
