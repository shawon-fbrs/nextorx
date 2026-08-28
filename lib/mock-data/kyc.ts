export interface MockKyc {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  documentType: 'passport' | 'id_card' | 'drivers_license';
  documentFront: string;
  documentBack: string;
  selfie: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export const mockKyc: MockKyc[] = [
  {
    id: 'kyc1',
    userId: '3',
    userName: 'Mike Wilson',
    userEmail: 'mike.wilson@example.com',
    documentType: 'passport',
    documentFront: '/docs/passport_front_3.jpg',
    documentBack: '/docs/passport_back_3.jpg',
    selfie: '/docs/selfie_3.jpg',
    status: 'pending',
    submittedAt: '2026-08-27T14:30:00Z',
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  },
  {
    id: 'kyc2',
    userId: '7',
    userName: 'Chris Brown',
    userEmail: 'chris.brown@example.com',
    documentType: 'id_card',
    documentFront: '/docs/id_front_7.jpg',
    documentBack: '/docs/id_back_7.jpg',
    selfie: '/docs/selfie_7.jpg',
    status: 'pending',
    submittedAt: '2026-08-28T09:00:00Z',
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  },
  {
    id: 'kyc3',
    userId: '12',
    userName: 'Maria Anderson',
    userEmail: 'maria.anderson@example.com',
    documentType: 'drivers_license',
    documentFront: '/docs/dl_front_12.jpg',
    documentBack: '/docs/dl_back_12.jpg',
    selfie: '/docs/selfie_12.jpg',
    status: 'pending',
    submittedAt: '2026-08-28T10:45:00Z',
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  },
  {
    id: 'kyc4',
    userId: '17',
    userName: 'Kevin Lewis',
    userEmail: 'kevin.lewis@example.com',
    documentType: 'passport',
    documentFront: '/docs/passport_front_17.jpg',
    documentBack: '/docs/passport_back_17.jpg',
    selfie: '/docs/selfie_17.jpg',
    status: 'rejected',
    submittedAt: '2026-08-25T11:20:00Z',
    reviewedAt: '2026-08-26T09:00:00Z',
    reviewedBy: 'Admin',
    rejectionReason: 'Document image is blurry. Please resubmit a clear photo.',
  },
  {
    id: 'kyc5',
    userId: '5',
    userName: 'Alex Johnson',
    userEmail: 'alex.johnson@example.com',
    documentType: 'id_card',
    documentFront: '/docs/id_front_5.jpg',
    documentBack: '/docs/id_back_5.jpg',
    selfie: '/docs/selfie_5.jpg',
    status: 'rejected',
    submittedAt: '2026-08-20T15:00:00Z',
    reviewedAt: '2026-08-21T10:30:00Z',
    reviewedBy: 'Admin',
    rejectionReason: 'Name on document does not match account name.',
  },
];
