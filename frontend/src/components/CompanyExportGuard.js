import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { fetchCompanyInfo } from '../utils/api';

export default function CompanyExportGuard({ children, isBlocked }) {
  // Remove internal state; rely directly on isBlocked prop
  // const [allowed, setAllowed] = useState(true);
  // const [checked, setChecked] = useState(false);

  // useEffect(() => {
  //   const run = async () => {
  //     const token = localStorage.getItem('token');
  //     const company = await fetchCompanyInfo(token);
  //     if (!company) {
  //       setAllowed(true);
  //     } else {
  //       const isPartiallyClosed = company.status === 'Partially Close';
  //       const isFullyClosed = company.status === 'Fully Close';
  //       const isUnpaid = company.payment_status === 'Unpaid';
  //       setAllowed(!(isPartiallyClosed || isFullyClosed || isUnpaid));
  //     }
  //     setChecked(true);
  //   };
  //   run();
  // }, []);

  if (isBlocked) {
    return (
      <button className="ml-2 bg-gray-300 text-gray-600 px-3 py-1 rounded cursor-not-allowed" title="Export disabled (Service limitations)" disabled>
        Export
      </button>
    );
  }
  return children;
}




