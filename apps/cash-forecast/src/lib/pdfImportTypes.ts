export type PdfImportRow = {
  installment: number;
  sourceDate: string;
  date: string;
  name: string;
  principal: number;
  interest: number;
  amount: number;
  page: number;
  acknowledgedDuplicate?: boolean;
};
