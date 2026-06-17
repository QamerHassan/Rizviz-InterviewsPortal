using System.Collections.Generic;
using System.Threading.Tasks;
using RizvizERP.API.Models;

namespace RizvizERP.API.Repositories
{
    public interface IGeneralFeedbackRepository
    {
        Task<GeneralFeedback> AddAsync(GeneralFeedback feedback);
        Task<IEnumerable<GeneralFeedback>> GetAllAsync();
        Task<GeneralFeedback> GetByIdAsync(int id);
        Task MarkSheetSyncedAsync(int id);
    }
}
