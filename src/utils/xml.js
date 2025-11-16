export function buildPain001({ company, employees, executionDate }) {
  const created = new Date().toISOString();
  const messageId = `MSG-${created.replace(/[-:T.Z]/g, "").slice(0, 14)}`;
  const total = employees.reduce((sum, emp) => sum + Number(emp.amount || 0), 0).toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${messageId}</MsgId>
      <CreDtTm>${created}</CreDtTm>
      <NbOfTxs>${employees.length}</NbOfTxs>
      <CtrlSum>${total}</CtrlSum>
      <InitgPty>
        <Nm>${company.name}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${messageId}-PAY</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${employees.length}</NbOfTxs>
      <CtrlSum>${total}</CtrlSum>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${company.name}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>ES8800000000000000000000</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>NDEAESMMXXX</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      ${employees
        .map(
          (emp, index) => `<CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${emp.id || `EMP${index + 1}`}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="EUR">${Number(emp.amount || 0).toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BIC>BSCHESMMXXX</BIC>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${emp.name}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>ES110000000000${String(index + 1).padStart(10, "0")}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>INV-${emp.plan}-${executionDate}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`
        )
        .join("\n")}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
}

export function parseXml(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  if (xml.getElementsByTagName("parsererror").length) {
    throw new Error("XML inválido");
  }
  return xml;
}
