"""
Builds samples/icici-style-statement.pdf: a fictional statement laid out like an ICICI Bank
multi-account PDF (summary page, fixed-deposit table, PPF + savings tables whose wrapped narrations are
vertically centred on the date row). All names, numbers and amounts are invented.

    python3 tests/make-icici-sample.py
"""
import json
from pathlib import Path
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent.parent / "samples" / "icici-style-statement.pdf"
EXP = OUT.with_suffix(".expected.json")
W, H = 612, 792
X_DATE, X_MODE, X_PART, R_DEP, R_WD, R_BAL = 27, 75.7, 158.5, 427.2, 505.1, 583.0
PITCH = 9.6

def money(v):
    s = f"{v:.2f}"; whole, frac = s.split(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:]); head = head[:-2]
        if head: parts.insert(0, head)
        whole = ",".join(parts + [tail])
    return f"{whole}.{frac}"

SAV_OPEN = 85000.00
SAV = [  # (date, mode, [narration lines], deposit, withdrawal)
    ("02-04-2025", "", ["NEFT-ABCDN52025040200000001-SAMPLE", "SOFTWARE PRIVATE LIMITED-SALARY-", "ABCD0000001"], 72000.00, None),
    ("03-04-2025", "", ["UPI/sample.pay@ibl/Payment from Ph/ICICI", "Bank/600000000001/IBL0000000000000000000000", "0001TEST PAYEE"], None, 1250.00),
    ("05-04-2025", "", ["UPI/freshmart@ybl/Payment for FRESHMART/YES", "BANK LIMITED/600000000002/YBL0000000000000000000", "0002"], None, 1840.50),
    ("07-04-2025", "663610000111IO", ["Int on FD/RD XXX0111 Tds:0.Int:464 and TAX:0."], 464.00, None),
    ("09-04-2025", "", ["UPI/cafe.bean@axl/Payment on CafeBean/AXIS", "BANK/600000000003/AXL0000000000000000000000"], None, 320.00),
    ("12-04-2025", "NET BANKING", ["INF/INFT/20250412000001/Self"], None, 50000.00),
    ("14-04-2025", "", ["TRF TO FD no. 663610000222"], None, 100000.00),
    ("18-04-2025", "", ["UPI/ridecab@icici/Payment for ride/ICICI Bank", "/600000000004/ICI0000000000000000000000"], None, 412.00),
    ("21-04-2025", "", ["DCARDFEE1234APR25-MAR26+GST"], None, 354.00),
    ("25-04-2025", "", ["UPI/9000000000@ibl/Payment from Ph/ICICI", "Bank/600000000005/IBL0000000000000000000000", "0005SAMPLE FRIEND"], 5000.00, None),
    ("02-05-2025", "", ["NEFT-ABCDN52025050200000002-SAMPLE", "SOFTWARE PRIVATE LIMITED-SALARY-", "ABCD0000001"], 72000.00, None),
    ("04-05-2025", "", ["UPI/electricboard@ybl/Electricity bill/YES BANK", "LIMITED/600000000006/YBL000000000000000000000", "0006"], None, 2150.00),
    ("08-05-2025", "", ["UPI/streamplus@ybl/Monthly plan/YES BANK", "LIMITED/600000000007/YBL0000000000000000000000"], None, 649.00),
    ("15-05-2025", "", ["FD clos 15-05-2025 SAMPLE USER"], 100000.00, None),
    ("20-05-2025", "", ["UPI/freshmart@ybl/Payment for FRESHMART/YES", "BANK LIMITED/600000000008/YBL0000000000000000000", "0008"], None, 2210.25),
    ("28-05-2025", "", ["BIL/INFT/EDXX000001/ SAMPLE LANDLORD"], None, 18000.00),
]
PPF_OPEN = 410000.00
PPF = [
    ("12-04-2025", "NET BANKING", ["INF/INFT/20250412000001/Self"], 50000.00, None),
    ("31-03-2026", "", ["000111222333:Int.Pd:01-04-2025 to 31-03-2026"], 31500.00, None),
]
FDS = [
    ("663610000222", "14-04-2025", 100000.00, 6.80, "15 Mths", "14-07-2026"),
    ("663610000333", "20-09-2025", 150000.00, 6.60, "24 Mths 1 Day", "21-09-2027"),
]

def build(OUT=OUT, EXP=EXP, SAV_OPEN=SAV_OPEN, SAV=SAV, PPF_OPEN=PPF_OPEN, PPF=PPF, FDS=FDS):
    c = canvas.Canvas(str(OUT), pagesize=(W, H))
    c.setTitle("Bank Statement"); c.setAuthor("Sample Bank Ltd")
    y = [H - 40]
    def txt(x, yy, s, size=7.2, font="Helvetica", right=False):
        c.setFont(font, size)
        (c.drawRightString if right else c.drawString)(x, yy, s)
    def page_header(n):
        txt(523.6, H, f"Page {n} of 3", 7.2)
        txt(27, H - 85, "MR SAMPLE USER", 8, "Helvetica-Bold")
    # ---- page 1: summary + FDs
    txt(27, H - 40, "ICICI Bank Limited", 9, "Helvetica-Bold")
    txt(27, H - 60, "Summary of Accounts held under Cust ID: 000000000 as on March 31, 2026", 8, "Helvetica-Bold")
    txt(27, H - 85, "SAMPLE USER (fictional statement for testing)", 8)
    txt(27, H - 110, "ACCOUNT TYPE", 7, "Helvetica-Bold"); txt(200, H - 110, "A/c BALANCE(I)", 7, "Helvetica-Bold")
    sav_close = SAV_OPEN + sum((d or 0) - (w or 0) for *_, d, w in SAV)
    ppf_close = PPF_OPEN + sum((d or 0) - (w or 0) for *_, d, w in PPF)
    txt(27, H - 122, "Savings A/c 000111222444"); txt(230, H - 122, money(sav_close), right=True)
    txt(27, H - 134, "PPF A/c 000111222333"); txt(230, H - 134, money(ppf_close), right=True)
    txt(27, H - 170, "FIXED DEPOSITS - INR", 8, "Helvetica-Bold")
    xs = [27, 100, 170, 235, 275, 345, 405, 470]
    for x, h in zip(xs, ["DEPOSIT NO.", "OPEN DATE", "DEP.AMT.#", "ROI%", "PERIOD", "MAT.AMT.^", "MAT.DATE", "BALANCE *"]): txt(x, H - 182, h, 6.5, "Helvetica-Bold")
    yy = H - 194
    for no, od, amt, roi, per, md in FDS:
        for x, v in zip(xs, [no, od, money(amt), f"{roi:.2f}", per, money(amt), md, money(amt)]): txt(x, yy, v, 6.8)
        txt(535, yy, "Registered", 6.8); yy -= 11
    c.showPage()

    # ---- transaction pages
    def table_header(top):
        txt(X_DATE, top, "DATE", 7, "Helvetica-Bold"); txt(X_MODE, top, "MODE**", 7, "Helvetica-Bold"); txt(X_PART, top, "PARTICULARS", 7, "Helvetica-Bold")
        txt(R_DEP, top, "DEPOSITS", 7, "Helvetica-Bold", right=True); txt(R_WD, top, "WITHDRAWALS", 7, "Helvetica-Bold", right=True); txt(R_BAL, top, "BALANCE", 7, "Helvetica-Bold", right=True)
    def draw_row(yc, date, mode, lines, dep, wd, bal):
        n = len(lines); top = yc + (n - 1) * PITCH / 2
        for i, ln in enumerate(lines): txt(X_PART, top - i * PITCH, ln)
        txt(X_DATE, yc, date)
        if mode: txt(X_MODE, yc, mode)
        if dep is not None: txt(R_DEP, yc, money(dep), right=True)
        if wd is not None: txt(R_WD, yc, money(wd), right=True)
        txt(R_BAL, yc, money(bal), right=True)
    def section(title, opening, rows, start_y, page_no):
        yy = start_y
        txt(27, yy, title, 7.5, "Helvetica-Bold"); yy -= 14
        table_header(yy); yy -= 14
        txt(X_DATE, yy, rows[0][0]); txt(X_PART, yy, "B/F"); txt(R_BAL, yy, money(opening), right=True); yy -= 16
        bal = opening; td = tw = 0.0
        for date, mode, lines, dep, wd in rows:
            h = len(lines) * PITCH + 7
            if yy - h < 50:
                c.showPage(); page_no += 1; page_header(page_no); txt(27, H - 100, "MR SAMPLE USER", 7.5); yy = H - 120; table_header(yy); yy -= 16
            yc = yy - (len(lines) - 1) * PITCH / 2
            bal += (dep or 0) - (wd or 0); td += dep or 0; tw += wd or 0
            draw_row(yc, date, mode, lines, dep, wd, bal)
            yy -= h + 3
        txt(X_PART - 4, yy, "TOTAL", 7.2, "Helvetica-Bold"); txt(R_DEP, yy, money(td), right=True); txt(R_WD, yy, money(tw), right=True); txt(R_BAL, yy, money(bal), right=True)
        return yy - 30, page_no, bal, td, tw
    page_header(2)
    yy, pg, ppf_bal, ppf_in, ppf_out = section("Statement of Transactions in Account Number: 000111222333 in INR for the period April 01, 2025 - March 31, 2026", PPF_OPEN, PPF, H - 120, 2)
    yy, pg, sav_bal, sav_in, sav_out = section("Statement of Transactions in Savings Account Number: 000111222444 in INR for the period April 01, 2025 - March 31, 2026", SAV_OPEN, SAV, yy, pg)
    c.save()
    EXP.write_text(json.dumps({
        "bank": "", "fds": len(FDS), "fd_total": sum(f[2] for f in FDS),
        "ppf": {"rows": len(PPF), "in": round(ppf_in, 2), "out": round(ppf_out, 2), "closing": round(ppf_bal, 2)},
        "savings": {"rows": len(SAV), "in": round(sav_in, 2), "out": round(sav_out, 2), "closing": round(sav_bal, 2)},
    }, indent=2) + "\n")

# A later statement (the next period): one FD matured, a new one opened, balances carried forward.
SAV2_OPEN = SAV_OPEN + sum((d or 0) - (w or 0) for *_, d, w in SAV)
SAV2 = [
    ("02-04-2026", "", ["NEFT-ABCDN52026040200000003-SAMPLE", "SOFTWARE PRIVATE LIMITED-SALARY-", "ABCD0000001"], 80000.00, None),
    ("06-04-2026", "", ["UPI/freshmart@ybl/Payment for FRESHMART/YES", "BANK LIMITED/600000000009/YBL0000000000000000000", "0009"], None, 2400.00),
    ("14-07-2026", "", ["FD clos 14-07-2026 SAMPLE USER"], 100000.00, None),
    ("16-07-2026", "", ["TRF TO FD no. 663610000444"], None, 120000.00),
    ("20-07-2026", "", ["UPI/cafe.bean@axl/Payment on CafeBean/AXIS", "BANK/600000000010/AXL0000000000000000000000"], None, 560.00),
]
PPF2_OPEN = PPF_OPEN + sum((d or 0) - (w or 0) for *_, d, w in PPF)
PPF2 = [("10-05-2026", "NET BANKING", ["INF/INFT/20260510000002/Self"], 20000.00, None)]
FDS2 = [
    ("663610000333", "20-09-2025", 150000.00, 6.60, "24 Mths 1 Day", "21-09-2027"),
    ("663610000444", "16-07-2026", 120000.00, 6.90, "12 Mths", "16-07-2027"),
]

if __name__ == "__main__":
    build(); print("wrote", OUT)
    out2 = OUT.with_name("icici-style-statement-next.pdf")
    build(out2, out2.with_suffix(".expected.json"), SAV2_OPEN, SAV2, PPF2_OPEN, PPF2, FDS2); print("wrote", out2)
