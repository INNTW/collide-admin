import React, { useState } from 'react';
import { DollarSign, Briefcase, TrendingUp, FileText } from 'lucide-react';
import { Select, Input, Btn, EmptyState, StatCard, SectionCard } from '../components';
import { BRAND } from '../constants/brand';
import { formatDate, currency } from '../utils/formatters';
import { CRATax } from '../lib/tax-engine';

const PayrollPage = ({ employees = [], events = [], locations = [], shifts = [] }) => {
  const [selectedEmployee, setSelectedEmployee] = useState(employees[0]?.id || "");
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().split("T")[0]
  );

  const employeePayroll = []; // pay_records integration pending — Phase 2
  const periodPayroll = employeePayroll.filter(
    (p) => p.date.substring(0, 7) === selectedPeriod.substring(0, 7)
  );

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.text }}>
        Payroll & T4
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Select
          label="Employee"
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          options={employees.map((e) => ({
            value: e.id,
            label: `${e.first_name} ${e.last_name}`,
          }))}
        />

        <Input
          label="Period"
          type="month"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        />
      </div>

      {selectedEmp && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Gross Income"
            value={currency(periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0))}
            color="primary"
          />
          <StatCard
            icon={Briefcase}
            label="Hours"
            value={`${(periodPayroll.reduce((sum, p) => sum + parseFloat(p.hours || 0), 0)).toFixed(1)}h`}
            color="primary"
          />
          <StatCard
            icon={DollarSign}
            label="Deductions"
            value={currency(
              CRATax.calculateTotalDeductions(
                periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                "ON"
              ).total
            )}
            color="warning"
          />
          <StatCard
            icon={TrendingUp}
            label="Net Pay"
            value={currency(
              periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) -
                CRATax.calculateTotalDeductions(
                  periodPayroll.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                  "ON"
                ).total
            )}
            color="success"
          />
        </div>
      )}

      <SectionCard title="Pay Stubs" icon={FileText}>
        {periodPayroll.length === 0 ? (
          <EmptyState
            title="No pay stubs"
            message="No payroll records for this period"
          />
        ) : (
          <div className="space-y-2">
            {periodPayroll.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: BRAND.text }}>
                    {formatDate(p.date)}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(224,230,255,0.6)" }}>
                    {p.hours} hours
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: BRAND.primary }}>
                    {currency(p.amount)}
                  </p>
                  <Btn icon={FileText} size="sm" variant="secondary">
                    View
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PayrollPage;
