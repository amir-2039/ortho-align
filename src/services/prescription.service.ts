import prisma from '../lib/prisma';
import { AlignmentGoal, ProcedureOption, MidlinePosition } from '@prisma/client';

interface PrescriptionData {
  // Duration
  durationRecommended?: boolean;
  durationLimitSteps?: number;
  
  // Existing Condition
  chiefComplaint: string;
  upperMidlinePosition?: MidlinePosition;
  upperMidlineShiftMm?: number;
  lowerMidlinePosition?: MidlinePosition;
  lowerMidlineShiftMm?: number;
  canineRelationshipRight?: string;
  canineRelationshipLeft?: string;
  molarRelationshipRight?: string;
  molarRelationshipLeft?: string;
  
  // Treat Arches
  treatUpperArch?: boolean;
  treatLowerArch?: boolean;
  
  // Alignment Goals
  upperMidlineGoal?: AlignmentGoal;
  lowerMidlineGoal?: AlignmentGoal;
  overjetGoal?: AlignmentGoal;
  overbiteGoal?: AlignmentGoal;
  archFormGoal?: AlignmentGoal;
  canineRelationshipGoal?: AlignmentGoal;
  molarRelationshipGoal?: AlignmentGoal;
  posteriorRelationshipGoal?: AlignmentGoal;
  
  // Procedures
  iprOption?: ProcedureOption;
  engagersOption?: ProcedureOption;
  proclineOption?: ProcedureOption;
  expandOption?: ProcedureOption;
  distalizeOption?: ProcedureOption;
  
  // Tooth-Specific
  avoidEngagersTeeth?: number[];
  extractTeeth?: number[];
  leaveSpacesTeeth?: number[];
  doNotMoveTeeth?: number[];
  
  // Retainer & Additional
  includeRetainer?: boolean;
  additionalInstructions?: string;
}

export class PrescriptionService {
  static validatePrescriptionData(data: PrescriptionData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Chief complaint is required
    if (!data.chiefComplaint || data.chiefComplaint.trim().length < 10) {
      errors.push('Chief complaint is required and must be at least 10 characters');
    }

    // Duration validation
    if (data.durationRecommended === false && !data.durationLimitSteps) {
      errors.push('Duration limit steps is required when not using recommended duration');
    }
    if (data.durationLimitSteps && data.durationLimitSteps <= 0) {
      errors.push('Duration limit steps must be greater than 0');
    }

    // Midline shift validation
    if (data.upperMidlinePosition === 'SHIFTED_RIGHT' || data.upperMidlinePosition === 'SHIFTED_LEFT') {
      if (!data.upperMidlineShiftMm || data.upperMidlineShiftMm <= 0) {
        errors.push('Upper midline shift in mm is required when midline is shifted');
      }
    }
    if (data.lowerMidlinePosition === 'SHIFTED_RIGHT' || data.lowerMidlinePosition === 'SHIFTED_LEFT') {
      if (!data.lowerMidlineShiftMm || data.lowerMidlineShiftMm <= 0) {
        errors.push('Lower midline shift in mm is required when midline is shifted');
      }
    }

    // At least one arch must be treated
    if (data.treatUpperArch === false && data.treatLowerArch === false) {
      errors.push('At least one arch must be selected for treatment');
    }

    // Validate tooth numbers (1-32)
    const validateTeeth = (teeth: number[] | undefined, fieldName: string) => {
      if (teeth && teeth.length > 0) {
        const invalidTeeth = teeth.filter(t => t < 1 || t > 32);
        if (invalidTeeth.length > 0) {
          errors.push(`${fieldName} contains invalid tooth numbers: ${invalidTeeth.join(', ')}. Must be 1-32`);
        }
      }
    };

    validateTeeth(data.avoidEngagersTeeth, 'Avoid engagers teeth');
    validateTeeth(data.extractTeeth, 'Extract teeth');
    validateTeeth(data.leaveSpacesTeeth, 'Leave spaces teeth');
    validateTeeth(data.doNotMoveTeeth, 'Do not move teeth');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async createOrUpdatePrescription(caseId: string, data: PrescriptionData) {
    const validation = this.validatePrescriptionData(data);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!case_) {
      throw new Error('Case not found');
    }

    const existingPrescription = await prisma.prescription.findUnique({
      where: { caseId },
    });

    const prescriptionData = {
      caseId,
      chiefComplaint: data.chiefComplaint,
      durationRecommended: data.durationRecommended ?? true,
      durationLimitSteps: data.durationLimitSteps,
      upperMidlinePosition: data.upperMidlinePosition ?? 'CENTERED',
      upperMidlineShiftMm: data.upperMidlineShiftMm,
      lowerMidlinePosition: data.lowerMidlinePosition ?? 'CENTERED',
      lowerMidlineShiftMm: data.lowerMidlineShiftMm,
      canineRelationshipRight: data.canineRelationshipRight,
      canineRelationshipLeft: data.canineRelationshipLeft,
      molarRelationshipRight: data.molarRelationshipRight,
      molarRelationshipLeft: data.molarRelationshipLeft,
      treatUpperArch: data.treatUpperArch ?? true,
      treatLowerArch: data.treatLowerArch ?? true,
      upperMidlineGoal: data.upperMidlineGoal ?? 'IMPROVE',
      lowerMidlineGoal: data.lowerMidlineGoal ?? 'IMPROVE',
      overjetGoal: data.overjetGoal ?? 'IMPROVE',
      overbiteGoal: data.overbiteGoal ?? 'IMPROVE',
      archFormGoal: data.archFormGoal ?? 'IMPROVE',
      canineRelationshipGoal: data.canineRelationshipGoal ?? 'IMPROVE',
      molarRelationshipGoal: data.molarRelationshipGoal ?? 'MAINTAIN',
      posteriorRelationshipGoal: data.posteriorRelationshipGoal ?? 'MAINTAIN',
      iprOption: data.iprOption ?? 'ONLY_IF_NEEDED',
      engagersOption: data.engagersOption ?? 'ONLY_IF_NEEDED',
      proclineOption: data.proclineOption ?? 'ONLY_IF_NEEDED',
      expandOption: data.expandOption ?? 'ONLY_IF_NEEDED',
      distalizeOption: data.distalizeOption ?? 'ONLY_IF_NEEDED',
      avoidEngagersTeeth: data.avoidEngagersTeeth ?? [],
      extractTeeth: data.extractTeeth ?? [],
      leaveSpacesTeeth: data.leaveSpacesTeeth ?? [],
      doNotMoveTeeth: data.doNotMoveTeeth ?? [],
      includeRetainer: data.includeRetainer ?? true,
      additionalInstructions: data.additionalInstructions,
    };

    if (existingPrescription) {
      return prisma.prescription.update({
        where: { caseId },
        data: prescriptionData,
      });
    } else {
      return prisma.prescription.create({
        data: prescriptionData,
      });
    }
  }

  static async getPrescription(caseId: string) {
    return prisma.prescription.findUnique({
      where: { caseId },
    });
  }

  static async deletePrescription(caseId: string) {
    const prescription = await prisma.prescription.findUnique({
      where: { caseId },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    await prisma.prescription.delete({
      where: { caseId },
    });

    return { message: 'Prescription deleted successfully' };
  }
}
