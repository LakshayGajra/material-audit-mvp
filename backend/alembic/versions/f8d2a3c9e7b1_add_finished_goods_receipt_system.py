"""Add finished goods receipt system

Revision ID: f8d2a3c9e7b1
Revises: 1aecca91581a
Create Date: 2026-01-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8d2a3c9e7b1'
down_revision: Union[str, Sequence[str], None] = '1aecca91581a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create finished_goods_inventory table
    op.create_table('finished_goods_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('finished_good_id', sa.Integer(), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('current_quantity', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),
        sa.Column('unit_of_measure', sa.String(length=20), nullable=True),
        sa.Column('last_receipt_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['finished_good_id'], ['finished_goods.id']),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('finished_good_id', 'warehouse_id', name='uq_fg_inventory_fg_warehouse')
    )
    op.create_index(op.f('ix_finished_goods_inventory_id'), 'finished_goods_inventory', ['id'], unique=False)
    op.create_index('ix_fg_inventory_warehouse', 'finished_goods_inventory', ['warehouse_id'], unique=False)

    # Create finished_goods_receipts table
    op.create_table('finished_goods_receipts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fgr_number', sa.String(length=20), nullable=False),
        sa.Column('contractor_id', sa.Integer(), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('receipt_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('received_by', sa.String(length=100), nullable=True),
        sa.Column('inspected_by', sa.String(length=100), nullable=True),
        sa.Column('inspection_date', sa.Date(), nullable=True),
        sa.Column('inspection_notes', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['contractor_id'], ['contractors.id']),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fgr_number')
    )
    op.create_index(op.f('ix_finished_goods_receipts_id'), 'finished_goods_receipts', ['id'], unique=False)
    op.create_index('ix_fgr_contractor_status', 'finished_goods_receipts', ['contractor_id', 'status'], unique=False)
    op.create_index('ix_fgr_receipt_date', 'finished_goods_receipts', ['receipt_date'], unique=False)

    # Create finished_goods_receipt_lines table
    op.create_table('finished_goods_receipt_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fgr_id', sa.Integer(), nullable=False),
        sa.Column('finished_good_id', sa.Integer(), nullable=False),
        sa.Column('quantity_delivered', sa.Numeric(precision=15, scale=3), nullable=False),
        sa.Column('quantity_accepted', sa.Numeric(precision=15, scale=3), nullable=True),
        sa.Column('quantity_rejected', sa.Numeric(precision=15, scale=3), nullable=False, server_default='0'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('unit_of_measure', sa.String(length=20), nullable=True),
        sa.Column('bom_deducted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['fgr_id'], ['finished_goods_receipts.id']),
        sa.ForeignKeyConstraint(['finished_good_id'], ['finished_goods.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_finished_goods_receipt_lines_id'), 'finished_goods_receipt_lines', ['id'], unique=False)
    op.create_index('ix_fgr_lines_fgr_id', 'finished_goods_receipt_lines', ['fgr_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_fgr_lines_fgr_id', table_name='finished_goods_receipt_lines')
    op.drop_index(op.f('ix_finished_goods_receipt_lines_id'), table_name='finished_goods_receipt_lines')
    op.drop_table('finished_goods_receipt_lines')

    op.drop_index('ix_fgr_receipt_date', table_name='finished_goods_receipts')
    op.drop_index('ix_fgr_contractor_status', table_name='finished_goods_receipts')
    op.drop_index(op.f('ix_finished_goods_receipts_id'), table_name='finished_goods_receipts')
    op.drop_table('finished_goods_receipts')

    op.drop_index('ix_fg_inventory_warehouse', table_name='finished_goods_inventory')
    op.drop_index(op.f('ix_finished_goods_inventory_id'), table_name='finished_goods_inventory')
    op.drop_table('finished_goods_inventory')
