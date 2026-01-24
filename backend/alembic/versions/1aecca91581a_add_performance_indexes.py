"""Add performance indexes

Revision ID: 1aecca91581a
Revises: 3b2172e10f19
Create Date: 2026-01-25 00:43:07.216621

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1aecca91581a'
down_revision: Union[str, Sequence[str], None] = '3b2172e10f19'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add severity column to anomalies
    op.add_column('anomalies', sa.Column('severity', sa.String(20), nullable=True))
    op.execute("UPDATE anomalies SET severity = 'MEDIUM' WHERE severity IS NULL")
    op.alter_column('anomalies', 'severity', nullable=False)

    # Consumption indexes
    op.create_index(
        'ix_consumption_contractor_material_date',
        'consumption',
        ['contractor_id', 'material_id', 'consumed_at']
    )

    # Anomaly indexes
    op.create_index(
        'ix_anomalies_contractor_resolved',
        'anomalies',
        ['contractor_id', 'resolved']
    )
    op.create_index(
        'ix_anomalies_severity',
        'anomalies',
        ['severity']
    )
    op.create_index(
        'ix_anomalies_created_at',
        'anomalies',
        ['created_at']
    )

    # Audit indexes (additional composite)
    op.create_index(
        'ix_audits_contractor_status_date',
        'audits',
        ['contractor_id', 'status', 'audit_date']
    )

    # Material rejection indexes (additional composite)
    op.create_index(
        'ix_material_rejections_contractor_status',
        'material_rejections',
        ['contractor_id', 'status']
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove indexes
    op.drop_index('ix_material_rejections_contractor_status', 'material_rejections')
    op.drop_index('ix_audits_contractor_status_date', 'audits')
    op.drop_index('ix_anomalies_created_at', 'anomalies')
    op.drop_index('ix_anomalies_severity', 'anomalies')
    op.drop_index('ix_anomalies_contractor_resolved', 'anomalies')
    op.drop_index('ix_consumption_contractor_material_date', 'consumption')

    # Remove severity column
    op.drop_column('anomalies', 'severity')
