using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;
using RizvizERP.API.Models;

namespace RizvizERP.API.Repositories
{
    public class GeneralFeedbackRepository : IGeneralFeedbackRepository
    {
        private readonly ApplicationDbContext _db;

        public GeneralFeedbackRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<GeneralFeedback> AddAsync(GeneralFeedback feedback)
        {
            feedback.Timestamp = DateTime.UtcNow;
            _db.GeneralFeedbacks.Add(feedback);
            await _db.SaveChangesAsync();
            return feedback;
        }

        public async Task<IEnumerable<GeneralFeedback>> GetAllAsync()
        {
            return await _db.GeneralFeedbacks
                            .AsNoTracking()
                            .OrderByDescending(f => f.Timestamp)
                            .ToListAsync();
        }

        public async Task<GeneralFeedback> GetByIdAsync(int id)
        {
            return await _db.GeneralFeedbacks.AsNoTracking()
                            .FirstOrDefaultAsync(f => f.Id == id);
        }

        public async Task MarkSheetSyncedAsync(int id)
        {
            var fb = await _db.GeneralFeedbacks.FindAsync(id);
            if (fb != null)
            {
                fb.SheetSynced = true;
                fb.SheetSyncedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }
        }
    }
}
