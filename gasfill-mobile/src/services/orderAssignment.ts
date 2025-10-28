/**
 * Order Assignment Service
 * 
 * Intelligent algorithm for assigning orders to the nearest available riders
 * with timeout and fallback mechanisms
 */

import { Rider } from '../types';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface AssignmentCandidate {
  rider: Rider;
  distance: number;
  estimatedTime: number;
}

export interface AssignmentResult {
  success: boolean;
  riderId?: number;
  riderName?: string;
  distance?: number;
  estimatedTime?: number;
  error?: string;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  point1: Location,
  point2: Location
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate estimated time in minutes based on distance
 * Assumes average speed of 30 km/h for motorcycles, 15 km/h for bicycles
 */
export const calculateEstimatedTime = (
  distance: number,
  vehicleType: string
): number => {
  const avgSpeed = vehicleType === 'bicycle' ? 15 : 30; // km/h
  const timeInHours = distance / avgSpeed;
  const timeInMinutes = Math.ceil(timeInHours * 60);
  return timeInMinutes;
};

/**
 * Filter riders by availability criteria:
 * - Status is 'available'
 * - Is active and verified
 * - Not suspended
 * - Has location data
 */
export const filterAvailableRiders = (riders: Rider[]): Rider[] => {
  return riders.filter(
    (rider) =>
      rider.status === 'available' &&
      rider.is_active === true &&
      rider.is_verified === true &&
      rider.is_suspended === false &&
      rider.location !== null &&
      rider.location !== undefined
  );
};

/**
 * Rank riders by distance and other criteria
 * Returns sorted list with nearest riders first
 */
export const rankRidersByDistance = (
  riders: Rider[],
  deliveryLocation: Location
): AssignmentCandidate[] => {
  const candidates: AssignmentCandidate[] = [];

  for (const rider of riders) {
    if (!rider.location) continue;

    const distance = calculateDistance(
      {
        latitude: rider.location.lat,
        longitude: rider.location.lng,
      },
      deliveryLocation
    );

    const estimatedTime = calculateEstimatedTime(distance, rider.vehicle_type);

    candidates.push({
      rider,
      distance,
      estimatedTime,
    });
  }

  // Sort by distance (nearest first)
  candidates.sort((a, b) => a.distance - b.distance);

  return candidates;
};

/**
 * Find the best rider for an order
 * Priority factors:
 * 1. Distance (primary)
 * 2. Rating (secondary)
 * 3. Total deliveries (experience)
 */
export const findBestRider = (
  availableRiders: Rider[],
  deliveryLocation: Location,
  maxDistance: number = 10 // Maximum distance in km
): AssignmentCandidate | null => {
  // Filter available riders
  const qualified = filterAvailableRiders(availableRiders);

  if (qualified.length === 0) {
    return null;
  }

  // Rank by distance
  const rankedCandidates = rankRidersByDistance(qualified, deliveryLocation);

  // Filter by max distance
  const withinRange = rankedCandidates.filter(
    (candidate) => candidate.distance <= maxDistance
  );

  if (withinRange.length === 0) {
    return null;
  }

  // Apply secondary ranking (rating and experience)
  const scoredCandidates = withinRange.map((candidate) => {
    const distanceScore = 1 / (candidate.distance + 1); // Closer = higher score
    const ratingScore = candidate.rider.rating / 5; // 0-1 scale
    const experienceScore = Math.min(candidate.rider.total_deliveries / 100, 1); // Cap at 100

    // Weighted score: distance (60%), rating (25%), experience (15%)
    const totalScore =
      distanceScore * 0.6 + ratingScore * 0.25 + experienceScore * 0.15;

    return {
      ...candidate,
      score: totalScore,
    };
  });

  // Sort by total score
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates[0];
};

/**
 * Assignment timeout tracker
 */
export class AssignmentTimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Set a timeout for an order assignment
   * Calls onTimeout after specified duration
   */
  setAssignmentTimeout(
    orderId: string,
    duration: number, // in milliseconds
    onTimeout: () => void
  ): void {
    // Clear existing timeout if any
    this.clearTimeout(orderId);

    const timeout = setTimeout(() => {
      onTimeout();
      this.timeouts.delete(orderId);
    }, duration);

    this.timeouts.set(orderId, timeout);
  }

  /**
   * Clear timeout when rider accepts
   */
  clearTimeout(orderId: string): void {
    const timeout = this.timeouts.get(orderId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(orderId);
    }
  }

  /**
   * Get remaining time for an order assignment
   */
  getRemainingTime(orderId: string): number {
    // This is a simplified version - in production, you'd track start time
    return this.timeouts.has(orderId) ? 30000 : 0; // 30 seconds default
  }

  /**
   * Clear all timeouts (cleanup)
   */
  clearAll(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
  }
}

/**
 * Assignment attempt tracker to prevent infinite loops
 */
export interface AssignmentAttempt {
  orderId: string;
  attemptedRiders: number[];
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
}

export class AssignmentAttemptTracker {
  private attempts: Map<string, AssignmentAttempt> = new Map();

  /**
   * Start tracking a new order assignment
   */
  startTracking(orderId: string, maxAttempts: number = 5): void {
    this.attempts.set(orderId, {
      orderId,
      attemptedRiders: [],
      attemptCount: 0,
      maxAttempts,
      createdAt: new Date(),
    });
  }

  /**
   * Record an assignment attempt to a rider
   */
  recordAttempt(orderId: string, riderId: number): boolean {
    const attempt = this.attempts.get(orderId);
    if (!attempt) return false;

    attempt.attemptedRiders.push(riderId);
    attempt.attemptCount++;

    return attempt.attemptCount < attempt.maxAttempts;
  }

  /**
   * Check if a rider has already been attempted for this order
   */
  hasAttempted(orderId: string, riderId: number): boolean {
    const attempt = this.attempts.get(orderId);
    return attempt ? attempt.attemptedRiders.includes(riderId) : false;
  }

  /**
   * Get riders that haven't been attempted yet
   */
  getUntriedRiders(orderId: string, allRiders: Rider[]): Rider[] {
    const attempt = this.attempts.get(orderId);
    if (!attempt) return allRiders;

    return allRiders.filter(
      (rider) => !attempt.attemptedRiders.includes(rider.id)
    );
  }

  /**
   * Check if max attempts reached
   */
  maxAttemptsReached(orderId: string): boolean {
    const attempt = this.attempts.get(orderId);
    return attempt ? attempt.attemptCount >= attempt.maxAttempts : false;
  }

  /**
   * Clear tracking for completed order
   */
  clearTracking(orderId: string): void {
    this.attempts.delete(orderId);
  }

  /**
   * Get attempt details
   */
  getAttempt(orderId: string): AssignmentAttempt | undefined {
    return this.attempts.get(orderId);
  }
}

// Singleton instances
export const timeoutManager = new AssignmentTimeoutManager();
export const attemptTracker = new AssignmentAttemptTracker();

/**
 * Main assignment orchestrator
 */
export const assignOrderToRider = async (
  orderId: string,
  deliveryLocation: Location,
  allRiders: Rider[],
  onAssigned: (riderId: number, distance: number, eta: number) => Promise<void>,
  onFailed: (reason: string) => Promise<void>,
  maxDistance: number = 10,
  timeoutDuration: number = 30000 // 30 seconds
): Promise<void> => {
  // Start tracking attempts
  if (!attemptTracker.getAttempt(orderId)) {
    attemptTracker.startTracking(orderId, 5);
  }

  // Get riders that haven't been tried yet
  const untriedRiders = attemptTracker.getUntriedRiders(orderId, allRiders);

  // Find best rider
  const bestCandidate = findBestRider(untriedRiders, deliveryLocation, maxDistance);

  if (!bestCandidate) {
    await onFailed('No available riders within range');
    attemptTracker.clearTracking(orderId);
    return;
  }

  // Record this attempt
  const canContinue = attemptTracker.recordAttempt(orderId, bestCandidate.rider.id);

  if (!canContinue) {
    await onFailed('Maximum assignment attempts reached');
    attemptTracker.clearTracking(orderId);
    return;
  }

  // Set timeout for this assignment
  timeoutManager.setAssignmentTimeout(orderId, timeoutDuration, async () => {
    console.log(`⏰ Assignment timeout for order ${orderId}, trying next rider...`);
    
    // Recursively try next rider
    await assignOrderToRider(
      orderId,
      deliveryLocation,
      allRiders,
      onAssigned,
      onFailed,
      maxDistance,
      timeoutDuration
    );
  });

  // Call the assignment callback
  await onAssigned(
    bestCandidate.rider.id,
    bestCandidate.distance,
    bestCandidate.estimatedTime
  );
};

/**
 * Cancel an ongoing assignment
 */
export const cancelAssignment = (orderId: string): void => {
  timeoutManager.clearTimeout(orderId);
  attemptTracker.clearTracking(orderId);
};

export default {
  calculateDistance,
  calculateEstimatedTime,
  filterAvailableRiders,
  rankRidersByDistance,
  findBestRider,
  assignOrderToRider,
  cancelAssignment,
  timeoutManager,
  attemptTracker,
};
