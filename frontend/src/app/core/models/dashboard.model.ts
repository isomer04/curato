export interface SystemStats {
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    totalAppointments: number;
}

export interface AppointmentBreakdown {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
}

export interface UserStats {
    activeUsers: number;
    newThisWeek: number;
    pendingVerification: number;
    inactive: number;
}

export interface QuickAction {
    route: string;
    label: string;
    icon: string;
}

/**
 * Pre-aggregated appointment counts returned by the dashboard-stats endpoint.
 * Used to build the patient dashboard summary cards without fetching full records.
 */
export interface AppointmentStatusCounts {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
}
