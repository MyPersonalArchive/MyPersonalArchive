﻿// <auto-generated />
using System;
using Backend.DbModel.Database;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace Backend.DbModel.Migrations
{
    [DbContext(typeof(MpaDbContext))]
    partial class MpaDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder.HasAnnotation("ProductVersion", "9.0.1");

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.ArchiveItem", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<DateTimeOffset>("CreatedAt")
                        .HasColumnType("TEXT");

                    b.Property<int>("TenantId")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(80)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("ArchiveItems");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.ArchiveItemAndTag", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("INTEGER");

                    b.Property<int>("ArchiveItemId")
                        .HasColumnType("INTEGER");

                    b.Property<int>("TagId")
                        .HasColumnType("INTEGER");

                    b.Property<int?>("TenantId")
                        .HasColumnType("INTEGER");

                    b.HasKey("Id");

                    b.HasIndex("ArchiveItemId", "TagId")
                        .IsUnique();

                    b.HasIndex("ArchiveItemId", "TenantId");

                    b.HasIndex("TagId", "TenantId");

                    b.ToTable("ArchiveItemAndTag");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Blob", b =>
                {
                    b.Property<int>("Id")
                        .HasColumnType("INTEGER");

                    b.Property<int?>("ArchiveItemId")
                        .HasColumnType("INTEGER");

                    b.Property<int?>("ArchiveItemTenantId")
                        .HasColumnType("INTEGER");

                    b.Property<string>("PathInStore")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<string>("StoreRoot")
                        .IsRequired()
                        .HasColumnType("TEXT");

                    b.Property<int>("TenantId")
                        .HasColumnType("INTEGER");

                    b.Property<DateTimeOffset>("UploadedAt")
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasAlternateKey("Id", "TenantId");

                    b.HasIndex("ArchiveItemId", "ArchiveItemTenantId");

                    b.ToTable("Blob");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Tag", b =>
                {
                    b.Property<int>("Id")
                        .HasColumnType("INTEGER");

                    b.Property<int>("TenantId")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(80)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasIndex("Title", "TenantId")
                        .IsUnique();

                    b.ToTable("Tag");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Tenant", b =>
                {
                    b.Property<int>("Id")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(80)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.ToTable("Tenant");

                    b.HasData(
                        new
                        {
                            Id = -1,
                            Title = "Demo tenant"
                        });
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Token", b =>
                {
                    b.Property<int>("Id")
                        .HasColumnType("INTEGER");

                    b.Property<DateTimeOffset>("ExpiresAt")
                        .HasColumnType("TEXT");

                    b.Property<string>("RefreshToken")
                        .IsRequired()
                        .HasMaxLength(44)
                        .HasColumnType("TEXT");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasMaxLength(80)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasIndex("Username");

                    b.ToTable("Token");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.User", b =>
                {
                    b.Property<int>("Id")
                        .HasColumnType("INTEGER");

                    b.Property<string>("Fullname")
                        .IsRequired()
                        .HasMaxLength(400)
                        .HasColumnType("TEXT");

                    b.Property<byte[]>("HashedPassword")
                        .IsRequired()
                        .HasMaxLength(32)
                        .HasColumnType("BLOB");

                    b.Property<byte[]>("Salt")
                        .IsRequired()
                        .HasMaxLength(16)
                        .HasColumnType("BLOB");

                    b.Property<string>("Username")
                        .IsRequired()
                        .HasMaxLength(80)
                        .HasColumnType("TEXT");

                    b.HasKey("Id");

                    b.HasIndex("Username")
                        .IsUnique();

                    b.ToTable("User");

                    b.HasData(
                        new
                        {
                            Id = 1,
                            Fullname = "administrator",
                            HashedPassword = new byte[] { 66, 97, 132, 170, 246, 16, 68, 68, 72, 145, 44, 35, 199, 50, 35, 84, 112, 60, 127, 205, 114, 113, 188, 167, 150, 243, 56, 250, 120, 177, 230, 211 },
                            Salt = new byte[] { 1, 213, 129, 249, 180, 144, 52, 198, 48, 36, 202, 218, 185, 111, 72, 110 },
                            Username = "admin@localhost"
                        });
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.UserTenant", b =>
                {
                    b.Property<int>("TenantId")
                        .HasColumnType("INTEGER");

                    b.Property<int>("UserId")
                        .HasColumnType("INTEGER");

                    b.HasKey("TenantId", "UserId");

                    b.HasIndex("UserId");

                    b.HasIndex("TenantId", "UserId")
                        .IsUnique();

                    b.ToTable("UserTenant");

                    b.HasData(
                        new
                        {
                            TenantId = -1,
                            UserId = 1
                        });
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.ArchiveItemAndTag", b =>
                {
                    b.HasOne("Backend.DbModel.Database.EntityModels.ArchiveItem", null)
                        .WithMany()
                        .HasForeignKey("ArchiveItemId", "TenantId")
                        .HasPrincipalKey("Id", "TenantId");

                    b.HasOne("Backend.DbModel.Database.EntityModels.Tag", null)
                        .WithMany()
                        .HasForeignKey("TagId", "TenantId")
                        .HasPrincipalKey("Id", "TenantId");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Blob", b =>
                {
                    b.HasOne("Backend.DbModel.Database.EntityModels.ArchiveItem", "ArchiveItem")
                        .WithMany("Blobs")
                        .HasForeignKey("ArchiveItemId", "ArchiveItemTenantId")
                        .HasPrincipalKey("Id", "TenantId");

                    b.Navigation("ArchiveItem");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.Token", b =>
                {
                    b.HasOne("Backend.DbModel.Database.EntityModels.User", "User")
                        .WithMany("Tokens")
                        .HasForeignKey("Username")
                        .HasPrincipalKey("Username")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.UserTenant", b =>
                {
                    b.HasOne("Backend.DbModel.Database.EntityModels.Tenant", null)
                        .WithMany()
                        .HasForeignKey("TenantId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("Backend.DbModel.Database.EntityModels.User", null)
                        .WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.ArchiveItem", b =>
                {
                    b.Navigation("Blobs");
                });

            modelBuilder.Entity("Backend.DbModel.Database.EntityModels.User", b =>
                {
                    b.Navigation("Tokens");
                });
#pragma warning restore 612, 618
        }
    }
}
