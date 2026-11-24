<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('medicine_batches', function (Blueprint $table) {
            $table->id();
            $table->enum('item_type', ['remedy', 'pharmaceutical'])->default('remedy');
            $table->foreignId('medicine_id')->nullable()->constrained('medicines')->cascadeOnDelete();
            $table->foreignId('pharmaceutical_id')->nullable()->constrained('pharmaceuticals')->cascadeOnDelete();
            $table->string('batch_number', 100);
            $table->string('potency', 50)->nullable();
            $table->string('form', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->default(0.00);
            $table->decimal('selling_price', 10, 2)->default(0.00);
            $table->decimal('initial_quantity', 10, 2)->default(0.00);
            $table->decimal('current_quantity', 10, 2)->default(0.00);
            $table->string('unit', 50)->default('unit');
            $table->decimal('reorder_level', 10, 2)->default(10.00);
            $table->string('supplier_name', 255)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['item_type', 'is_active']);
            $table->index('expiry_date');
            $table->index('batch_number');
            $table->index(['current_quantity', 'reorder_level']);
        });

        Schema::create('stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicine_batch_id')->constrained('medicine_batches')->cascadeOnDelete();
            $table->enum('transaction_type', ['purchase', 'dispense', 'adjustment', 'return', 'wastage'])->default('purchase');
            $table->decimal('quantity', 10, 2);
            $table->decimal('balance_after', 10, 2);
            $table->foreignId('visit_id')->nullable()->constrained('visits')->nullOnDelete();
            $table->foreignId('prescription_item_id')->nullable()->constrained('prescription_items')->nullOnDelete();
            $table->string('reference_number', 100)->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('medicine_batch_id');
            $table->index('visit_id');
            $table->index(['transaction_type', 'created_at']);
        });

        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->boolean('auto_deduct_inventory')->default(false)->after('practice_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clinic_settings', function (Blueprint $table) {
            $table->dropColumn('auto_deduct_inventory');
        });

        Schema::dropIfExists('stock_transactions');
        Schema::dropIfExists('medicine_batches');
    }
};
