import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './CustomerSearch.css'; // Inherit styles for layout

export const CustomerCardSkeleton = ({ viewMode }) => {
    // Mimic the container class so it fits the grid/list layout
    // The parent 'customer-list' already handles the grid-template-columns.
    // So we just need this component to be the card content.

    if (viewMode === 'list') {
        return (
            <div className="customer-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
                {/* ID | Name | City | Phone | Branch | QR */}
                {/* Mimic Grid Columns from CSS: 80px 3fr 1.5fr 1.5fr 100px 60px */}

                {/* ID */}
                <Skeleton width={60} height={24} borderRadius={4} />

                {/* Name */}
                <Skeleton width="80%" height={20} />

                {/* City */}
                <div className="detail-item city">
                    <Skeleton width="90%" />
                </div>

                {/* Phone */}
                <div className="detail-item phone">
                    <Skeleton width="80%" />
                </div>

                {/* Branch */}
                <div className="detail-item factory" style={{ justifyContent: 'flex-start' }}>
                    <Skeleton width="70%" />
                </div>

                {/* QR */}
                <div className="customer-qr">
                    <Skeleton width={30} height={30} />
                </div>
            </div>
        );
    }

    // GRID VIEW (Default)
    return (
        <div className="customer-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
            <div className="customer-header">
                <Skeleton width={50} height={20} /> {/* ID */}
                <Skeleton width={100} height={16} /> {/* Name */}
            </div>
            <div className="customer-details">
                <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="80%" height={14} style={{ marginBottom: 6 }} />
                <Skeleton width="60%" height={14} />
            </div>
        </div>
    );
};
