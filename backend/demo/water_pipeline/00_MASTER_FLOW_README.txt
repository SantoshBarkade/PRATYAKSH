PRATYAKSH / INFRA LINK — MUNICIPAL WATER PIPELINE UPGRADE — ZONE 4
DEMO DATA PACK

Project:
Municipal Water Pipeline Upgrade — Zone 4

Purpose:
This demo pack is designed to demonstrate the complete planning-to-execution flow:
1. Import the baseline schedule.
2. Upload the multi-activity site report.
3. Upload contractor evidence.
4. Upload supervisor evidence with intentionally different observations.
5. Review reconciliation conflicts.
6. Upload an unmatched field memo and demonstrate the Review Queue.
7. Use the progress-history files to demonstrate historical execution movement.

IMPORTANT DEMO ORDER
--------------------
1. Import: 01_schedule.xlsx
2. Upload: 02_site_report.txt
3. Upload: 03_contractor_evidence.txt
4. Upload: 04_supervisor_evidence.txt
5. Open Reconciliation.
6. Upload: 05_unknown_field_memo.txt
7. Open Review Queue.
8. Use 06–09 as historical progress evidence/history if the application supports history import.

EXPECTED RECONCILIATION
-----------------------
W001:
Contractor = 96%
Supervisor = 95%
Difference = 1 percentage point

W002:
Contractor = 74%
Supervisor = 75%
Difference = 1 percentage point

The differences are intentional and represent two independent measurements of the
same activities. They are not data corruption.

EXPECTED REVIEW QUEUE
---------------------
05_unknown_field_memo.txt contains an activity code that is NOT present in the
schedule. It should remain unmatched and must not mutate a schedule activity.

EXPECTED PLANNED BASELINE
-------------------------
W001 Utility Survey & Marking              100%
W002 Trench Excavation                      88%
W003 DI Pipeline Laying                     72%
W004 Valve Chamber Construction             61%
W005 Service Connection Transfer            42%
W006 Pressure Testing & Commissioning       18%

DATA CONSISTENCY RULES
----------------------
- Dates progress chronologically.
- Progress values stay between 0% and 100%.
- Historical progress never decreases.
- Evidence activity codes match the schedule except for the intentional unknown
  field memo.
- Contractor and supervisor values are intentionally close but not identical.
- No file claims an activity is complete when its progress is below 100%.
