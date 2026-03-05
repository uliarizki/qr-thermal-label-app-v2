import React from 'react';
import './CustomerSearch.css';

const CustomerCard = React.memo(({ customer, onClick, style }) => {
    return (
        <div
            className="customer-card"
            onClick={() => onClick(customer)}
            style={style} // For virtualization compatibility later
        >
            <div className="customer-header">
                <span className="customer-id">{customer.id}</span>
                <span className="customer-name">{customer.nama}</span>
            </div>
            <div className="customer-details">
                <div className="detail-item city" title="Kota">
                    {customer.kota ? `📍 ${customer.kota}` : <span className="empty">-</span>}
                </div>
                <div className="detail-item phone" title="Telepon">
                    {customer.telp ? `📱 ${customer.telp}` : <span className="empty">-</span>}
                </div>
                <div className="detail-item factory" title="Pabrik/Cabang">
                    {customer.cabang || customer.pabrik ? `🏭 ${customer.cabang || customer.pabrik}` : <span className="empty">-</span>}
                </div>
            </div>
        </div>
    );
});

export default CustomerCard;
