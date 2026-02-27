"""Remove audit and reconciliation tables, update inventory adjustments FK

Revision ID: 16e7b2dc3a99
Revises: c3d4e5f6a7b8
Create Date: 2026-02-27 16:30:01.370808

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16e7b2dc3a99'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Remove old audit and reconciliation systems.
    Replace audit_line_item_id FK with inventory_check_line_id on inventory_adjustments.
    """
    # 1. Drop the FK constraint on inventory_adjustments referencing audit_line_items
    op.drop_constraint(
        'inventory_adjustments_audit_line_item_id_fkey',
        'inventory_adjustments',
        type_='foreignkey'
    )
    # Drop the old column
    op.drop_column('inventory_adjustments', 'audit_line_item_id')
    # Add new column referencing inventory_check_lines
    op.add_column(
        'inventory_adjustments',
        sa.Column('inventory_check_line_id', sa.Integer(), sa.ForeignKey('inventory_check_lines.id'), nullable=True)
    )

    # 2. Drop reconciliation tables (lines first due to FK)
    op.drop_table('reconciliation_lines')
    op.drop_table('reconciliations')

    # 3. Drop audit tables (line items first due to FK)
    op.drop_table('audit_line_items')
    op.drop_table('audits')


def downgrade() -> None:
    """Recreate audit and reconciliation tables (structure only, no data)."""
    # Recreate audits table
    op.create_table(
        'audits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('audit_number', sa.String(50), unique=True, nullable=False),
        sa.Column('contractor_id', sa.Integer(), sa.ForeignKey('contractors.id'), nullable=False),
        sa.Column('audit_date', sa.Date(), nullable=False),
        sa.Column('auditor_name', sa.String(100), nullable=False),
        sa.Column('audit_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='IN_PROGRESS'),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Recreate audit_line_items table
    op.create_table(
        'audit_line_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('audit_id', sa.Integer(), sa.ForeignKey('audits.id'), nullable=False),
        sa.Column('material_id', sa.Integer(), sa.ForeignKey('materials.id'), nullable=False),
        sa.Column('physical_count', sa.Numeric(15, 6), nullable=True),
        sa.Column('expected_quantity', sa.Numeric(15, 6), nullable=True),
        sa.Column('variance', sa.Numeric(15, 6), nullable=True),
        sa.Column('variance_percentage', sa.Numeric(8, 4), nullable=True),
        sa.Column('threshold_used', sa.Numeric(8, 4), nullable=True),
        sa.Column('is_anomaly', sa.Boolean(), nullable=True),
        sa.Column('anomaly_id', sa.Integer(), nullable=True),
        sa.Column('auditor_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Recreate reconciliations table
    op.create_table(
        'reconciliations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reconciliation_number', sa.String(50), unique=True, nullable=False),
        sa.Column('contractor_id', sa.Integer(), sa.ForeignKey('contractors.id'), nullable=False),
        sa.Column('reconciliation_date', sa.Date(), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='SUBMITTED'),
        sa.Column('submitted_by', sa.String(100), nullable=True),
        sa.Column('reviewed_by', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Recreate reconciliation_lines table
    op.create_table(
        'reconciliation_lines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('reconciliation_id', sa.Integer(), sa.ForeignKey('reconciliations.id'), nullable=False),
        sa.Column('material_id', sa.Integer(), sa.ForeignKey('materials.id'), nullable=False),
        sa.Column('system_quantity', sa.Numeric(15, 6), nullable=False),
        sa.Column('reported_quantity', sa.Numeric(15, 6), nullable=False),
        sa.Column('variance', sa.Numeric(15, 6), nullable=True),
        sa.Column('variance_percentage', sa.Numeric(8, 4), nullable=True),
        sa.Column('is_anomaly', sa.Boolean(), nullable=True),
        sa.Column('anomaly_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # Restore inventory_adjustments FK
    op.drop_column('inventory_adjustments', 'inventory_check_line_id')
    op.add_column(
        'inventory_adjustments',
        sa.Column('audit_line_item_id', sa.Integer(), sa.ForeignKey('audit_line_items.id'), nullable=True)
    )
