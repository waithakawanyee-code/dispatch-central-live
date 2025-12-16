export type DriverStatus = "available" | "on-route" | "break" | "offline";
export type VehicleStatus = "active" | "out-of-service";
export type CleanStatus = "clean" | "dirty";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  currentLocation?: string;
  shiftStart?: string;
  shiftEnd?: string;
  vehicleId?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: VehicleStatus;
  cleanStatus: CleanStatus;
  location: "on-route" | "at-base";
  assignedDriver?: string;
  lastService?: string;
}

export interface ScheduleEntry {
  id: string;
  driverName: string;
  driverId: string;
  vehicleId: string;
  shiftStart: string;
  shiftEnd: string;
  route?: string;
  status: DriverStatus;
}

export const mockDrivers: Driver[] = [
  {
    id: "DRV-001",
    name: "Marcus Johnson",
    phone: "(555) 123-4567",
    status: "on-route",
    currentLocation: "Downtown → Airport",
    shiftStart: "06:00",
    shiftEnd: "14:00",
    vehicleId: "VH-201",
  },
  {
    id: "DRV-002",
    name: "Sarah Chen",
    phone: "(555) 234-5678",
    status: "available",
    currentLocation: "Base Station A",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    vehicleId: "VH-205",
  },
  {
    id: "DRV-003",
    name: "James Williams",
    phone: "(555) 345-6789",
    status: "break",
    currentLocation: "Rest Stop 12",
    shiftStart: "10:00",
    shiftEnd: "18:00",
    vehicleId: "VH-203",
  },
  {
    id: "DRV-004",
    name: "Emily Rodriguez",
    phone: "(555) 456-7890",
    status: "on-route",
    currentLocation: "Industrial Park → Port",
    shiftStart: "07:00",
    shiftEnd: "15:00",
    vehicleId: "VH-202",
  },
  {
    id: "DRV-005",
    name: "Michael Thompson",
    phone: "(555) 567-8901",
    status: "offline",
    shiftStart: "14:00",
    shiftEnd: "22:00",
  },
  {
    id: "DRV-006",
    name: "Lisa Park",
    phone: "(555) 678-9012",
    status: "available",
    currentLocation: "Base Station B",
    shiftStart: "06:00",
    shiftEnd: "14:00",
    vehicleId: "VH-207",
  },
  {
    id: "DRV-007",
    name: "David Martinez",
    phone: "(555) 789-0123",
    status: "on-route",
    currentLocation: "Suburb → City Center",
    shiftStart: "09:00",
    shiftEnd: "17:00",
    vehicleId: "VH-204",
  },
  {
    id: "DRV-008",
    name: "Amanda Foster",
    phone: "(555) 890-1234",
    status: "offline",
    shiftStart: "18:00",
    shiftEnd: "02:00",
  },
];

export const mockVehicles: Vehicle[] = [
  {
    id: "VH-201",
    plate: "ABC-1234",
    model: "Ford Transit 2023",
    status: "active",
    cleanStatus: "clean",
    location: "on-route",
    assignedDriver: "Marcus Johnson",
    lastService: "2024-01-10",
  },
  {
    id: "VH-202",
    plate: "DEF-5678",
    model: "Mercedes Sprinter 2022",
    status: "active",
    cleanStatus: "clean",
    location: "on-route",
    assignedDriver: "Emily Rodriguez",
    lastService: "2024-01-08",
  },
  {
    id: "VH-203",
    plate: "GHI-9012",
    model: "Ford Transit 2023",
    status: "active",
    cleanStatus: "dirty",
    location: "at-base",
    assignedDriver: "James Williams",
    lastService: "2024-01-05",
  },
  {
    id: "VH-204",
    plate: "JKL-3456",
    model: "Chevrolet Express 2022",
    status: "active",
    cleanStatus: "clean",
    location: "on-route",
    assignedDriver: "David Martinez",
    lastService: "2024-01-12",
  },
  {
    id: "VH-205",
    plate: "MNO-7890",
    model: "Ford Transit 2021",
    status: "active",
    cleanStatus: "clean",
    location: "at-base",
    assignedDriver: "Sarah Chen",
    lastService: "2024-01-09",
  },
  {
    id: "VH-206",
    plate: "PQR-1234",
    model: "RAM ProMaster 2023",
    status: "out-of-service",
    cleanStatus: "dirty",
    location: "at-base",
    lastService: "2023-12-20",
  },
  {
    id: "VH-207",
    plate: "STU-5678",
    model: "Mercedes Sprinter 2023",
    status: "active",
    cleanStatus: "clean",
    location: "at-base",
    assignedDriver: "Lisa Park",
    lastService: "2024-01-11",
  },
  {
    id: "VH-208",
    plate: "VWX-9012",
    model: "Ford Transit 2022",
    status: "out-of-service",
    cleanStatus: "dirty",
    location: "at-base",
    lastService: "2023-12-15",
  },
];

export const mockSchedule: ScheduleEntry[] = [
  {
    id: "SCH-001",
    driverName: "Marcus Johnson",
    driverId: "DRV-001",
    vehicleId: "VH-201",
    shiftStart: "06:00",
    shiftEnd: "14:00",
    route: "Downtown → Airport",
    status: "on-route",
  },
  {
    id: "SCH-002",
    driverName: "Emily Rodriguez",
    driverId: "DRV-004",
    vehicleId: "VH-202",
    shiftStart: "07:00",
    shiftEnd: "15:00",
    route: "Industrial Park → Port",
    status: "on-route",
  },
  {
    id: "SCH-003",
    driverName: "Sarah Chen",
    driverId: "DRV-002",
    vehicleId: "VH-205",
    shiftStart: "08:00",
    shiftEnd: "16:00",
    route: "Standby - Base A",
    status: "available",
  },
  {
    id: "SCH-004",
    driverName: "David Martinez",
    driverId: "DRV-007",
    vehicleId: "VH-204",
    shiftStart: "09:00",
    shiftEnd: "17:00",
    route: "Suburb → City Center",
    status: "on-route",
  },
  {
    id: "SCH-005",
    driverName: "James Williams",
    driverId: "DRV-003",
    vehicleId: "VH-203",
    shiftStart: "10:00",
    shiftEnd: "18:00",
    route: "Break",
    status: "break",
  },
  {
    id: "SCH-006",
    driverName: "Michael Thompson",
    driverId: "DRV-005",
    vehicleId: "VH-206",
    shiftStart: "14:00",
    shiftEnd: "22:00",
    route: "Pending Assignment",
    status: "offline",
  },
];
