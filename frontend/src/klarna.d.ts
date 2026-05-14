interface KlarnaPaymentsAuthorizeResponse {
  approved: boolean;
  authorization_token?: string;
  show_form?: boolean;
  error?: { invalid_fields?: string[] };
}

interface KlarnaPaymentsLoadResponse {
  show_form: boolean;
  error?: { invalid_fields?: string[] };
}

interface Window {
  Klarna?: {
    Payments: {
      init(options: { client_token: string }): void;
      load(
        options: { container: string; payment_method_category: string },
        data: object,
        callback: (res: KlarnaPaymentsLoadResponse) => void,
      ): void;
      authorize(
        options: { payment_method_category: string },
        data: object,
        callback: (res: KlarnaPaymentsAuthorizeResponse) => void,
      ): void;
    };
  };
}
