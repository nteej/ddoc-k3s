<?php

declare(strict_types = 1);

namespace App\Infrastructure\Repositories;

use App\Domain\Entities\Template;
use App\Domain\Repositories\TemplateRepositoryInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TemplateRepository implements TemplateRepositoryInterface
{
    private const COLUMNS = ['id', 'name', 'description', 'company_id', 'paper_format', 'paper_orientation'];

    public function exists(array $filters): bool
    {
        return DB::table('templates')
            ->select(self::COLUMNS)
            ->when(! empty($filters['id']),          fn(Builder $q) => $q->where('id', $filters['id']))
            ->when(! empty($filters['name']),        fn(Builder $q) => $q->where('name', $filters['name']))
            ->when(! empty($filters['description']), fn(Builder $q) => $q->where('description', $filters['description']))
            ->when(! empty($filters['companyId']),   fn(Builder $q) => $q->where('company_id', $filters['companyId']))
            ->exists();
    }

    public function findAllUsingFilters(array $filters = []): Collection
    {
        return DB::table('templates')
            ->select(self::COLUMNS)
            ->when(! empty($filters['id']),          fn(Builder $q) => $q->where('id', $filters['id']))
            ->when(! empty($filters['name']),        fn(Builder $q) => $q->where('name', $filters['name']))
            ->when(! empty($filters['description']), fn(Builder $q) => $q->where('description', $filters['description']))
            ->when(! empty($filters['companyId']),   fn(Builder $q) => $q->where('company_id', $filters['companyId']))
            ->get();
    }

    public function findFirstUsingFilters(array $filters = []): ?Template
    {
        $row = DB::table('templates')
            ->select(self::COLUMNS)
            ->when(! empty($filters['id']),          fn(Builder $q) => $q->where('id', $filters['id']))
            ->when(! empty($filters['name']),        fn(Builder $q) => $q->where('name', $filters['name']))
            ->when(! empty($filters['description']), fn(Builder $q) => $q->where('description', $filters['description']))
            ->when(! empty($filters['companyId']),   fn(Builder $q) => $q->where('company_id', $filters['companyId']))
            ->first();

        return $row ? $this->mapRow($row) : null;
    }

    public function findOneById(string $id): ?Template
    {
        $row = DB::table('templates')->select(self::COLUMNS)->where('id', $id)->first();
        return $row ? $this->mapRow($row) : null;
    }

    public function insert(Template $template): string
    {
        DB::table('templates')->insert([
            'id'                => $template->id,
            'name'              => $template->name,
            'description'       => $template->description,
            'company_id'        => $template->companyId,
            'paper_format'      => $template->paperFormat,
            'paper_orientation' => $template->paperOrientation,
        ]);

        return $template->id;
    }

    public function update(Template $template): bool
    {
        return (bool) DB::table('templates')->where('id', $template->id)->update([
            'name'              => $template->name,
            'description'       => $template->description,
            'company_id'        => $template->companyId,
            'paper_format'      => $template->paperFormat,
            'paper_orientation' => $template->paperOrientation,
        ]);
    }

    public function delete(string $id): bool
    {
        return (bool) DB::table('templates')->where('id', $id)->delete();
    }

    private function mapRow(object $row): Template
    {
        return Template::restore(
            id:               $row->id,
            name:             $row->name,
            description:      $row->description,
            companyId:        $row->company_id,
            paperFormat:      $row->paper_format ?? 'A4',
            paperOrientation: $row->paper_orientation ?? 'portrait',
        );
    }
}
